const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const XLSX = require('xlsx');

// GENERATES BURDEN DATA for burden.js. I excluded mapc_region_residential_sales.csv as its too big. 

// Define paths - adjust as needed
const PUBLIC_DIR = './public/burden_data';
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'preprocessed_data.json');

async function generateData() {
  console.log('Starting data preprocessing...');
  
  try {
    // 1. Load all raw data files
    const [rawGeo, chiaRows, rb12, rb22, sales, evicts] = await Promise.all([
      // Municipalities geojson
      JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'mapc_municipalities.geojson'), 'utf8')),
      
      // CHIA cross-walk (Excel file)
      (() => {
        const buf = fs.readFileSync(path.join(PUBLIC_DIR, '2022-CHIA-Zip-Code-List.xlsx'));
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, { header: 1 });
      })(),
      
      // Rent burden 2012
      d3.csvParse(fs.readFileSync(path.join(PUBLIC_DIR, 'nhgis0001_ds201_20135_zcta.csv'), 'utf8')),
      
      // Rent burden 2022
      d3.csvParse(fs.readFileSync(path.join(PUBLIC_DIR, 'nhgis0001_ds267_20235_zcta.csv'), 'utf8')),
      
      // Residential sales
      d3.csvParse(fs.readFileSync(path.join(PUBLIC_DIR, 'mapc_region_residential_sales.csv'), 'utf8')),
      
      // Evictions
      d3.csvParse(fs.readFileSync(path.join(PUBLIC_DIR, 'Evictions (2020-2024) Court Filings + Case Type + Property  ZIP + Attorney Details + Plaintiff Details_filings.csv'), 'utf8'))
    ]);
    
    console.log('All data files loaded successfully');

    // 2. Process Municipality ↔ ZIP cross-walk
    const zip2muni = {};
    const muni2zipLocal = {};
    chiaRows.slice(1).forEach(r => {
      const zip = String(r[0]).padStart(5, '0');
      // Prefer the "City" column (index 2); fall back to Postal‑area name (index 1)
      const muniRaw = r[2] ?? r[1];
      const muni = String(muniRaw || '').trim();
      if (!zip || !muni) return;
      if (muni.toLowerCase() === 'foxborough') return;  // drop Foxborough

      // If this ZIP was previously mapped to a *different* municipality, remove it there
      if (zip2muni[zip] && zip2muni[zip] !== muni) {
        const old = zip2muni[zip];
        if (muni2zipLocal[old]) {
          muni2zipLocal[old] = muni2zipLocal[old].filter(z => z !== zip);
        }
      }

      // Record (or overwrite) the definitive mapping
      zip2muni[zip] = muni;

      // Add to muni's ZIP set (avoid duplicates)
      const lst = (muni2zipLocal[muni] = muni2zipLocal[muni] || []);
      if (!lst.includes(zip)) lst.push(zip);
    });
    
    const metroZips = new Set(Object.keys(zip2muni));
    
    // 3. Process rent burden data
    const num = v => {
      if (v == null) return 0;
      const s = String(v).replace(/,/g, '').trim();
      if (s === '.' || s === '') return 0;
      const n = +s;
      return Number.isFinite(n) ? n : 0;
    };
    
    const share = d => {
      const tot = num(d.UMFE001);
      const burden =
        num(d.UMFE007) +
        num(d.UMFE008) +
        num(d.UMFE009) +
        num(d.UMFE010);
      return tot > 0 ? (burden / tot) * 100 : null;
    };
    
    const burden12 = {}, burden22 = {};
    rb12.forEach(d => {
      const raw = d.ZCTA5A || d.SLDLA;
      if (!raw) return;
      const z = String(raw).padStart(5, '0');
      if (metroZips.has(z)) burden12[z] = share(d);
    });
    
    rb22.forEach(d => {
      const raw = d.ZCTA5A || d.SLDLA;
      if (!raw) return;
      const z = String(raw).padStart(5, '0');
      if (metroZips.has(z)) burden22[z] = share(d);
    });
    
    // 4. Process investor share data
    const ALLOWED_USECODES = new Set([
      '101','102','103','104','105','107','108','109',
      '110','111','112','113','114','115','116','117','118','119'
    ]);
    
    // Purchases 2020‑24 (proxy for household count, by ZIP)
    const households = {};
    const inv12 = {}, inv22 = {};
    
    sales.forEach(d => {
      const zip = String(d.zip).padStart(5, '0');
      if (!metroZips.has(zip)) return;
      if (!ALLOWED_USECODES.has(String(d.usecode))) return;
      
      const yr = +d.year;
      // Count qualifying purchases between 2020‑2024
      if (yr >= 2020 && yr <= 2024) {
        households[zip] = (households[zip] || 0) + 1;
      }
      
      const isInv = d.investor_type_purchase !== 'Non-investor';
      const tgt = yr === 2012 ? inv12 : yr === 2022 ? inv22 : null;
      if (!tgt) return;
      tgt[zip] = tgt[zip] || { inv: 0, tot: 0 };
      tgt[zip].tot += 1;
      if (isInv) tgt[zip].inv += 1;
    });
    
    const invChange = {};
    metroZips.forEach(z => {
      if (inv12[z] && inv22[z]) {
        const pct12 = (inv12[z].inv / inv12[z].tot) * 100;
        const pct22 = (inv22[z].inv / inv22[z].tot) * 100;
        if (pct22 > 0) {
          // Inverted: positive means the 2012 share was larger (decline in 2022)
          let rel = (pct12 / pct22 - 1) * 100;
          if (Number.isFinite(rel)) {
            rel = Math.max(-100, Math.min(100, rel));
            invChange[z] = rel;
          } else {
            invChange[z] = null;
          }
        } else {
          invChange[z] = null;
        }
      }
    });
    
    // 5. Process evictions data
    const evCnt = {};
    evicts.forEach(d => {
      // Year filter – accept 2020–2024 filings only
      let yr = null;
      if (d.year != null && String(d.year).trim() !== '') {
        yr = +d.year;
      }
      if (yr == null) {
        const dtRaw =
          d.file_date ??
          d.filing_date ??
          d['File Date'] ??
          d['Filing Date'] ??
          d.date ??
          '';
        const m = String(dtRaw).match(/(\d{4})\b/); // grab any 4-digit year
        yr = m ? +m[1] : null;
      }
      if (yr == null || yr < 2020 || yr > 2024) return;

      // Case-type filter – must contain "no cause"
      const ctKey = Object.keys(d)
        .find(k => k.toLowerCase().includes('case') && k.toLowerCase().includes('type'));
      const ctRaw = ctKey ? d[ctKey] : '';
      const ct = String(ctRaw).toLowerCase().replace(/[^a-z]/g, ' ');
      if (!ct.includes('no cause')) return;

      // Determine target ZIP(s)
      let targets = [];

      // Preferred: extract a 3- to 5-digit ZIP and restore leading zero
      const rawZipCandidates = [
        d.zip, d.ZIP, d.Zip, d.zip_code, d['ZIP Code'],
        d.property_zip, d['Property ZIP']
      ];
      const rawZip = rawZipCandidates.find(v => v != null && String(v).trim() !== '') ?? '';
      const zipMatch = String(rawZip).match(/\d{3,5}(?=\D|$)/); // 3- to 5-digit token
      if (zipMatch) {
        const z = zipMatch[0].padStart(5, '0');
        if (metroZips.has(z)) targets.push(z);
      }

      // Fallback: city → ZIP cross-walk
      if (targets.length === 0) {
        const cityKey = Object.keys(d)
          .find(k => k.toLowerCase() === 'city' || k.toLowerCase().includes('municip'));
        if (cityKey) {
          const muniName = String(d[cityKey]).trim().toLowerCase();
          const muniKey = Object.keys(muni2zipLocal)
            .find(k => k.toLowerCase() === muniName);
          if (muniKey) targets = muni2zipLocal[muniKey];
        }
      }

      // Increment absolute counts
      targets.forEach(z => { evCnt[z] = (evCnt[z] || 0) + 1; });
    });
    
    // Convert counts → rates
    const evRate = {};
    Object.entries(evCnt).forEach(([z, cnt]) => {
      const h = households[z] || 0;
      if (h > 0) evRate[z] = (cnt / h) * 100000;
    });
    
    // 6. Filter geometry and process the final records
    const allowedMunis = new Set(rawGeo.features.map(f => f.properties.municipal));
    
    // Identify and drop the 5 highest‑rate ZIPs (outliers)
    const top3 = Object.entries(evRate)
      .filter(([z]) => allowedMunis.has(zip2muni[z]))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([z]) => z);
      
    top3.forEach(z => { evRate[z] = null; });
    const skipZips = new Set(top3);
    
    // Generate ZIP-level records
    const zipRecs = Array.from(metroZips)
      .filter(z =>
        allowedMunis.has(zip2muni[z]) &&
        !skipZips.has(z)
      )
      .map(z => ({
        zip: z,
        muni: zip2muni[z],
        costChange: (burden12[z] != null && burden12[z] > 0 && burden22[z] != null)
          ? (() => {
              const raw = (burden22[z] / burden12[z] - 1) * 100;
              if (!Number.isFinite(raw)) return null;
              return Math.max(-100, Math.min(100, raw));
            })()
          : null,
        investorChange: invChange[z] ?? null,
        evictions: evRate[z] ?? null
      }));
    
    // Generate municipality aggregates for choropleth
    const muniRecs = Object.entries(muni2zipLocal).map(([muni, zips]) => {
      const zipMap = {};
      zipRecs.forEach(r => (zipMap[r.zip] = r));
      
      const data = zips.map(z => zipMap[z]).filter(Boolean);
      const mean = (arr, f) => {
        const v = arr.map(d => d[f]).filter(vv => vv !== null && Number.isFinite(vv));
        return v.length ? d3.mean(v) : null;
      };
      
      return {
        muni,
        zips,
        costChange: mean(data, 'costChange'),
        investorChange: mean(data, 'investorChange'),
        evictions: mean(data, 'evictions')
      };
    });
    
    // 7. Prepare simplified geojson for the map
    // Filter to remove Foxborough
    const filteredGeo = {
      ...rawGeo,
      features: rawGeo.features.filter(f => f.properties.municipal !== 'Foxborough')
    };

    // 8. Write the final output file
    const outputData = {
      geo: filteredGeo,      // We'll keep the full GeoJSON and simplify in the component
      zipRecords: zipRecs,
      muniRecords: muniRecs,
      muni2zips: muni2zipLocal
    };
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    console.log(`Preprocessed data saved to: ${OUTPUT_PATH}`);
    
  } catch (error) {
    console.error('Error preprocessing data:', error);
    process.exit(1);
  }
}

generateData();
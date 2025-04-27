import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import * as topojsonSimplify from 'topojson-simplify';

/**
 * HousingDashboard
 *
 * Metro‑Boston ZIP‑level scatter plot linked to a municipality choropleth.
 *   • % change renter cost‑burden (2012 → 2022)
 *   • % change investor share of sales (2012 → 2022)
 *   • No‑cause evictions, 2022
 *
 * Extra packages:
 *     npm i xlsx topojson-server topojson-client topojson-simplify
 */

function HousingDashboard() {
  //--------------------------------------------------------------------
  // Layout
  //--------------------------------------------------------------------
  const MAP_W = 880;
  const MAP_H = 560;
  const SCATTER = 480;

  //--------------------------------------------------------------------
  // State
  //--------------------------------------------------------------------
  const [geo, setGeo] = useState(null);            // simplified municipal polygons
  const [zipRecords, setZipRecords] = useState(null);   // ZIP‑level metrics
  const [muniRecords, setMuniRecords] = useState(null); // municipality aggregates
  const [metric, setMetric] = useState('cost');    // choropleth toggle
  const [hoverZips, setHoverZips] = useState(new Set());
  const [lockedZips, setLockedZips] = useState([]);

  const mapRef = useRef(null);
  const scatterRef = useRef(null);
  const muni2zips = useRef({});                    // { muni : [zip,…] }

  //--------------------------------------------------------------------
  // Load & prepare data  ------------------------------------------------
  //--------------------------------------------------------------------
  // Replace the data loading useEffect with this:

useEffect(() => {
  d3.json(`${process.env.PUBLIC_URL}/burden_data/preprocessed_data.json`)
    .then(data => {
      // Extract the preprocessed data
      const { geo: rawGeo, zipRecords, muniRecords, muni2zips: muni2zipLocal } = data;
      
      // Store the municipality to ZIP mapping
      muni2zips.current = muni2zipLocal;
      
      // Apply TopoJSON simplification for map rendering
      const topo = topojsonServer.topology({ muni: rawGeo });
      topojsonSimplify.presimplify(topo);
      topojsonSimplify.simplify(topo, 1e-5);           // keep ~1% of points
      
      // Set state with preprocessed data
      setGeo(topojsonClient.feature(topo, topo.objects.muni));
      setZipRecords(zipRecords);
      setMuniRecords(muniRecords);
    });
}, []);

  // useEffect(() => {
  //   Promise.all([
  //     d3.json(`${process.env.PUBLIC_URL}/burden_data/mapc_municipalities.geojson`),
  //     // CHIA cross‑walk
  //     fetch(`${process.env.PUBLIC_URL}/burden_data/2022-CHIA-Zip-Code-List.xlsx`)
  //       .then(r => r.arrayBuffer())
  //       .then(buf => {
  //         const wb = XLSX.read(buf, { type: 'array' });
  //         const ws = wb.Sheets[wb.SheetNames[0]];
  //         return XLSX.utils.sheet_to_json(ws, { header: 1 });
  //       }),
  //     // Rent burden (ACS 2009‑13  ≈ 2012)
  //     d3.csv(`${process.env.PUBLIC_URL}/burden_data/nhgis0001_ds201_20135_zcta.csv`),
  //     // Rent burden (ACS 2019‑23  ≈ 2022)
  //     d3.csv(`${process.env.PUBLIC_URL}/burden_data/nhgis0001_ds267_20235_zcta.csv`),
  //     // Residential sales
  //     d3.csv(`${process.env.PUBLIC_URL}/burden_data/mapc_region_residential_sales.csv`),
  //     // Evictions
  //     d3.csv(`${process.env.PUBLIC_URL}/burden_data/Evictions (2020-2024) Court Filings + Case Type + Property  ZIP + Attorney Details + Plaintiff Details_filings.csv`)
  //   ]).then(([rawGeo, chiaRows, rb12, rb22, sales, evicts]) => {
  //     //----------------------------------------------------------------
  //     // Municipality ↔ ZIP cross‑walk (CHIA file)
  //     //----------------------------------------------------------------
  //     const zip2muni = {};
  //     const muni2zipLocal = {};
  //     chiaRows.slice(1).forEach(r => {
  //       const zip = String(r[0]).padStart(5, '0');
  //       // Prefer the “City” column (index 2); fall back to Postal‑area name (index 1)
  //       const muniRaw = r[2] ?? r[1];
  //       const muni = String(muniRaw || '').trim();
  //       if (!zip || !muni) return;
  //       if (muni.toLowerCase() === 'foxborough') return;  // drop Foxborough

  //       // If this ZIP was previously mapped to a *different* municipality, remove it there
  //       if (zip2muni[zip] && zip2muni[zip] !== muni) {
  //         const old = zip2muni[zip];
  //         if (muni2zipLocal[old]) {
  //           muni2zipLocal[old] = muni2zipLocal[old].filter(z => z !== zip);
  //         }
  //       }

  //       // Record (or overwrite) the definitive mapping
  //       zip2muni[zip] = muni;

  //       // Add to muni's ZIP set (avoid duplicates)
  //       const lst = (muni2zipLocal[muni] = muni2zipLocal[muni] || []);
  //       if (!lst.includes(zip)) lst.push(zip);
  //     });
  //     muni2zips.current = muni2zipLocal;
  //     const metroZips = new Set(Object.keys(zip2muni));

  //     //----------------------------------------------------------------
  //     // Helper: share of renters cost‑burdened ≥ 30 %
  //     //----------------------------------------------------------------
  //     // Coerce field value to number, treating ".", "", or undefined as 0
  //     const num = v => {
  //       if (v == null) return 0;
  //       const s = String(v).replace(/,/g, '').trim();
  //       if (s === '.' || s === '') return 0;
  //       const n = +s;
  //       return Number.isFinite(n) ? n : 0;
  //     };
  //     const share = d => {
  //       const tot = num(d.UMFE001);
  //       const burden =
  //         num(d.UMFE007) +
  //         num(d.UMFE008) +
  //         num(d.UMFE009) +
  //         num(d.UMFE010);
  //       return tot > 0 ? (burden / tot) * 100 : null;
  //     };
  //     const burden12 = {}, burden22 = {};
  //     rb12.forEach(d => {
  //       const raw = d.ZCTA5A || d.SLDLA;          // fallback when ZCTA5A is blank
  //       if (!raw) return;
  //       const z = String(raw).padStart(5, '0');
  //       if (metroZips.has(z)) burden12[z] = share(d);
  //     });
  //     rb22.forEach(d => {
  //       const raw = d.ZCTA5A || d.SLDLA;          // ZIP is stored in SLDLA in ds267
  //       if (!raw) return;
  //       const z = String(raw).padStart(5, '0');
  //       if (metroZips.has(z)) burden22[z] = share(d);
  //     });

  //     //----------------------------------------------------------------
  //     // Investor share
  //     //----------------------------------------------------------------
  //     // Filter to residential property use‑codes
  //     const ALLOWED_USECODES = new Set([
  //       '101','102','103','104','105','107','108','109',
  //       '110','111','112','113','114','115','116','117','118','119'
  //     ]);
  //     // Purchases 2020‑24 (proxy for household count, by ZIP)
  //     const households = {};
  //     const inv12 = {}, inv22 = {};
  //     sales.forEach(d => {
  //       const zip = String(d.zip).padStart(5, '0');
  //       if (!metroZips.has(zip)) return;
  //       if (!ALLOWED_USECODES.has(String(d.usecode))) return;
  //       const yr = +d.year;
  //       // Count qualifying purchases between 2020‑2024
  //       if (yr >= 2020 && yr <= 2024) {
  //         households[zip] = (households[zip] || 0) + 1;
  //       }
  //       const isInv = d.investor_type_purchase !== 'Non-investor';
  //       const tgt = yr === 2012 ? inv12 : yr === 2022 ? inv22 : null;
  //       if (!tgt) return;
  //       tgt[zip] = tgt[zip] || { inv: 0, tot: 0 };
  //       tgt[zip].tot += 1;
  //       if (isInv) tgt[zip].inv += 1;
  //     });
  //     const invChange = {};
  //     metroZips.forEach(z => {
  //       if (inv12[z] && inv22[z]) {
  //         const pct12 = (inv12[z].inv / inv12[z].tot) * 100;
  //         const pct22 = (inv22[z].inv / inv22[z].tot) * 100;
  //         if (pct22 > 0) {
  //           // Inverted: positive means the 2012 share was larger (decline in 2022)
  //           let rel = (pct12 / pct22 - 1) * 100;          // invert numerator/denominator
  //           if (Number.isFinite(rel)) {
  //             rel = Math.max(-100, Math.min(100, rel));   // clip to [‑100, 100]
  //             invChange[z] = rel;
  //           } else {
  //             invChange[z] = null;
  //           }
  //         } else {
  //           invChange[z] = null;                          // undefined when baseline is 0
  //         }
  //       }
  //     });

  //     // --- evictions (2020–2024 “No Cause”, robust field matching) ------------
  //     const evCnt = {};
  //     evicts.forEach(d => {
  //       //----------------------------------------------------------------
  //       // 1) Year filter – accept 2020–2024 filings only
  //       //----------------------------------------------------------------
  //       let yr = null;
  //       if (d.year != null && String(d.year).trim() !== '') {
  //         yr = +d.year;
  //       }
  //       if (yr == null) {
  //         const dtRaw =
  //           d.file_date ??
  //           d.filing_date ??
  //           d['File Date'] ??
  //           d['Filing Date'] ??
  //           d.date ??
  //           '';
  //         const m = String(dtRaw).match(/(\d{4})\b/); // grab any 4-digit year
  //         yr = m ? +m[1] : null;
  //       }
  //       if (yr == null || yr < 2020 || yr > 2024) return;

  //       //----------------------------------------------------------------
  //       // 2) Case-type filter – must contain “no cause”
  //       //----------------------------------------------------------------
  //       const ctKey = Object.keys(d)
  //         .find(k => k.toLowerCase().includes('case') && k.toLowerCase().includes('type'));
  //       const ctRaw = ctKey ? d[ctKey] : '';
  //       const ct = String(ctRaw).toLowerCase().replace(/[^a-z]/g, ' ');
  //       if (!ct.includes('no cause')) return;          // catches “sp transfer- no cause” too

  //       //----------------------------------------------------------------
  //       // 3) Determine target ZIP(s)
  //       //----------------------------------------------------------------
  //       let targets = [];

  //       // 3 a. Preferred: extract a 3- to 5-digit ZIP and restore leading zero
  //       const rawZipCandidates = [
  //         d.zip, d.ZIP, d.Zip, d.zip_code, d['ZIP Code'],
  //         d.property_zip, d['Property ZIP']
  //       ];
  //       const rawZip = rawZipCandidates.find(v => v != null && String(v).trim() !== '') ?? '';
  //       const zipMatch = String(rawZip).match(/\d{3,5}(?=\D|$)/); // 3- to 5-digit token
  //       if (zipMatch) {
  //         const z = zipMatch[0].padStart(5, '0');
  //         if (metroZips.has(z)) targets.push(z);
  //       }

  //       // 3 b. Fallback: city → ZIP cross-walk
  //       if (targets.length === 0) {
  //         const cityKey = Object.keys(d)
  //           .find(k => k.toLowerCase() === 'city' || k.toLowerCase().includes('municip'));
  //         if (cityKey) {
  //           const muniName = String(d[cityKey]).trim().toLowerCase();
  //           const muniKey = Object.keys(muni2zipLocal)
  //             .find(k => k.toLowerCase() === muniName);
  //           if (muniKey) targets = muni2zipLocal[muniKey];
  //         }
  //       }

  //       //----------------------------------------------------------------
  //       // 4) Increment absolute counts
  //       //----------------------------------------------------------------
  //       targets.forEach(z => { evCnt[z] = (evCnt[z] || 0) + 1; });
  //     });

  //     // Convert counts → rates
  //     const evRate = {};
  //     Object.entries(evCnt).forEach(([z, cnt]) => {
  //       const h = households[z] || 0;
  //       if (h > 0) evRate[z] = (cnt / h) * 100000;
  //     });

  //     //----------------------------------------------------------------
  //     // Municipalities present in geometry (Foxborough excluded later)
  //     const allowedMunis = new Set(rawGeo.features.map(f => f.properties.municipal));

  //     // Identify and drop the 3 highest‑rate ZIPs *among those that actually map*
  //     const top3 = Object.entries(evRate)
  //       .filter(([z]) => allowedMunis.has(zip2muni[z]))        // limit to on‑map ZIPs
  //       .sort((a, b) => b[1] - a[1])
  //       .slice(0, 5)
  //       .map(([z]) => z);

  //     top3.forEach(z => { evRate[z] = null; });
  //     const skipZips = new Set(top3);

  //     //----------------------------------------------------------------
  //     // ZIP‑level records
  //     //----------------------------------------------------------------
  //     const zipRecs = Array.from(metroZips)
  //       .filter(z =>
  //         allowedMunis.has(zip2muni[z]) &&     // keep only ZIPs on the map
  //         !skipZips.has(z)                     // drop the three outliers
  //       )
  //       .map(z => ({
  //         zip: z,
  //         muni: zip2muni[z],
  //         costChange: (burden12[z] != null && burden12[z] > 0 && burden22[z] != null)
  //           ? (() => {
  //               const raw = (burden22[z] / burden12[z] - 1) * 100;
  //               if (!Number.isFinite(raw)) return null;
  //               return Math.max(-100, Math.min(100, raw));   // clip to [‑100, 100]
  //             })()
  //           : null,
  //         investorChange: invChange[z] ?? null,
  //         evictions: evRate[z] ?? null
  //       }));
  //     setZipRecords(zipRecs);
  //     const zipMap = {};
  //     zipRecs.forEach(r => (zipMap[r.zip] = r));

  //     //----------------------------------------------------------------
  //     // Municipality aggregates for mapping
  //     //----------------------------------------------------------------
  //     const muniRecs = Object.entries(muni2zipLocal).map(([muni, zips]) => {
  //       const data = zips.map(z => zipMap[z]).filter(Boolean);
  //       const mean = (arr, f) => {
  //         const v = arr.map(d => d[f]).filter(vv => vv !== null && Number.isFinite(vv));
  //         return v.length ? d3.mean(v) : null;
  //       };
  //       return {
  //         muni,
  //         zips,                                             // <-- keep list of ZIPs
  //         costChange: mean(data, 'costChange'),
  //         investorChange: mean(data, 'investorChange'),
  //         evictions: mean(data, 'evictions')
  //       };
  //     });
  //     setMuniRecords(muniRecs);

  //     //----------------------------------------------------------------
  //     // Geometry simplification (TopoJSON)
  //     //----------------------------------------------------------------
  //     // Drop Foxborough polygon
  //     const filteredGeo = {
  //       ...rawGeo,
  //       features: rawGeo.features.filter(f => f.properties.municipal !== 'Foxborough')
  //     };
  //     const topo = topojsonServer.topology({ muni: filteredGeo });
  //     topojsonSimplify.presimplify(topo);
  //     topojsonSimplify.simplify(topo, 1e-5);           // keep ~1% of points
  //     setGeo(topojsonClient.feature(topo, topo.objects.muni));
  //   });
  // }, []);

  //--------------------------------------------------------------------
  // Scales
  //--------------------------------------------------------------------
  const choropleth = useMemo(() => {
    if (!muniRecords) return () => '#ccc';
    const vals = muniRecords
      .map(d => (
        metric === 'cost'     ? d.costChange :
        metric === 'investor' ? d.investorChange :
        d.evictions
      ))
      .filter(v => v !== null && Number.isFinite(v));
    const scale = d3.scaleSequential()
      .domain(d3.extent(vals))
      .interpolator(d3.interpolateBlues);
    return v => (v === null ? '#ccc' : scale(v));
  }, [muniRecords, metric]);

  const mapR = useMemo(() => {
    if (!muniRecords) return () => 0;
    return d3.scaleSqrt()
      .domain([0, d3.max(muniRecords, d => d.evictions)])
      .range([0, 16]);
  }, [muniRecords]);

  const scatterR = useMemo(() => {
    if (!muniRecords) return () => 2;
    return d3.scaleSqrt()
      .domain([0, d3.max(muniRecords, d => d.evictions)])
      .range([2, 10]);
  }, [muniRecords]);

  //--------------------------------------------------------------------
  // Map panel
  //--------------------------------------------------------------------
  useEffect(() => {
    if (!geo || !muniRecords) return;

    const muniMap = {};
    muniRecords.forEach(r => (muniMap[r.muni] = r));

    const svg = d3.select(mapRef.current);
    svg.selectAll('*').remove();

    const proj = d3.geoMercator().fitSize([MAP_W, MAP_H], geo);
    const path = d3.geoPath().projection(proj);

    // Polygons
    svg.append('g')
      .selectAll('path')
      .data(geo.features)
      .join('path')
      .attr('d', path)
      .attr('fill', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        const hasData = v !== null && Number.isFinite(v);
        return hasData ? choropleth(v) : 'none';
      })
      .attr('pointer-events', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        return v !== null && Number.isFinite(v) ? 'auto' : 'none';
      })
      .attr('stroke', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        return v !== null && Number.isFinite(v) ? '#fff' : 'none';
      })
      .attr('stroke-width', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        if (v === null || !Number.isFinite(v)) return 0;
        const zips = muni2zips.current[d.properties.municipal] || [];
        return zips.some(z => hoverZips.has(z)) ? 2 : 0.4;
      })
      .on('mouseover', (_, d) => {
        const z = muni2zips.current[d.properties.municipal] || [];
        setHoverZips(new Set(z));
      })
      .on('mouseout', () => setHoverZips(new Set()))
      .on('click', (_, d) => {
        const z = muni2zips.current[d.properties.municipal] || [];
        setLockedZips(prev => {
          const s = new Set(prev);
          const all = z.every(zc => s.has(zc));
          (all ? z : []).forEach(zc => s.delete(zc));
          (!all ? z : []).forEach(zc => s.add(zc));
          return Array.from(s);
        });
      });

    // Eviction circles
    svg.append('g')
      .selectAll('circle')
      .data(muniRecords.filter(r => r.evictions > 0))
      .join('circle')
      .attr('cx', d => {
        const f = geo.features.find(g => g.properties.municipal === d.muni);
        return f ? path.centroid(f)[0] : -999;
      })
      .attr('cy', d => {
        const f = geo.features.find(g => g.properties.municipal === d.muni);
        return f ? path.centroid(f)[1] : -999;
      })
      .attr('r', d => mapR(d.evictions))
      .attr('fill', 'rgba(200,30,30,0.55)')
      .attr('pointer-events', 'none');
  }, [geo, muniRecords, metric, choropleth, mapR]);

  // ----- lightweight hover updates (avoid full map redraw) -------------
  useEffect(() => {
    if (!geo || !muniRecords) return;
    const svg = d3.select(mapRef.current);
    svg.selectAll('path').attr('stroke-width', d => {
      const r = muniRecords.find(m => m.muni === d.properties.municipal);
      const v =
        metric === 'cost'     ? r?.costChange :
        metric === 'investor' ? r?.investorChange :
        r?.evictions;
      if (v === null || !Number.isFinite(v)) return 0;      // hidden region
      const zips = muni2zips.current[d.properties.municipal] || [];
      return zips.some(z => hoverZips.has(z)) ? 2 : 0.4;
    });
  }, [hoverZips, geo, muniRecords, metric]);

  //--------------------------------------------------------------------
  // Scatter panel
  //--------------------------------------------------------------------
  useEffect(() => {
    if (!muniRecords) return;

    const svg = d3.select(scatterRef.current);
    svg.selectAll('*').remove();

    const m = { t: 40, r: 30, b: 70, l: 70 };
    const w = SCATTER - m.l - m.r;
    const h = SCATTER - m.t - m.b;

    const x = d3.scaleLinear()
      .domain(d3.extent(muniRecords, d => d.investorChange))
      .nice()
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(muniRecords, d => d.evictions)])
      .nice()
      .range([h, 0]);

    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(v => `${v}%`))
      .selectAll('text')
      .attr('font-size', 14)
      .attr('dy', '0.75em');

    g.append('g')
      .call(d3.axisLeft(y));

    // Larger tick fonts
    g.selectAll('.tick text').attr('font-size', 14);

    // Axis labels
    g.append('text')
      .attr('x', w / 2)
      .attr('y', h + 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', 16)
      .text('% relative change investor share (2012–2022)');

    g.append('text')
      .attr('x', -h / 2)
      .attr('y', -55)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('font-size', 16)
      .text('No‑cause evictions per 100 000 households (2020–2024)');

    g.append('text')
      .attr('x', w / 2)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold')
      .text('Investor‑share change vs. 2022 No‑cause evictions');

    // ------------------------------------------------------------------
    // Linear trendline (least‑squares fit across all finite points)
    // ------------------------------------------------------------------
    const pts = muniRecords.filter(d =>
      Number.isFinite(d.investorChange) &&
      Number.isFinite(d.evictions)
    );
    if (pts.length > 1) {
      const n = pts.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      pts.forEach(p => {
        sumX  += p.investorChange;
        sumY  += p.evictions;
        sumXY += p.investorChange * p.evictions;
        sumX2 += p.investorChange * p.investorChange;
      });
      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;

        const x0d = x.domain()[0];
        const x1d = x.domain()[1];
        const y0d = slope * x0d + intercept;
        const y1d = slope * x1d + intercept;

        g.append('line')
          .attr('x1', x(x0d))
          .attr('y1', y(y0d))
          .attr('x2', x(x1d))
          .attr('y2', y(y1d))
          .attr('stroke', '#000')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,2')
          .attr('pointer-events', 'none');
      }
    }
    // Points
    g.selectAll('circle')
      .data(muniRecords)
      .join('circle')
      .attr('cx', d => x(d.investorChange))
      .attr('cy', d => y(d.evictions))
      .attr('r', d => scatterR(d.evictions))
      .attr('fill', d => d3.interpolateReds(d.evictions / d3.max(muniRecords, r => r.evictions || 1)))
      .attr('stroke', d => d.zips.some(z => hoverZips.has(z)) ? '#000' : '#444')
      .attr('stroke-width', d => d.zips.some(z => hoverZips.has(z)) ? 2 : 0.4)
      .attr('opacity', 0.8)
      .on('mouseover', (_, d) => setHoverZips(new Set(d.zips)))
      .on('mouseout', () => setHoverZips(new Set()))
      .on('click', (_, d) => {
        setLockedZips(prev => {
          const s = new Set(prev);
          const all = d.zips.every(z => s.has(z));
          (all ? d.zips : []).forEach(z => s.delete(z));
          (!all ? d.zips : []).forEach(z => s.add(z));
          return Array.from(s);
        });
      });

    // Brush for linking
    const brush = d3.brush()
      .extent([[0, 0], [w, h]])
      .on('brush end', (ev) => {
        if (!ev.selection) { setHoverZips(new Set()); return; }
        const [[x0, y0], [x1, y1]] = ev.selection;
        setHoverZips(new Set(
          muniRecords
            .filter(d => {
              const px = x(d.investorChange);
              const py = y(d.evictions);
              return px >= x0 && px <= x1 && py >= y0 && py <= y1;
            })
            .flatMap(d => d.zips)
        ));
      });
    g.append('g').call(brush);
  }, [muniRecords, hoverZips, scatterR]);

  //--------------------------------------------------------------------
  // Update scatter strokes on hoverZips change
  //--------------------------------------------------------------------
  useEffect(() => {
    const svg = d3.select(scatterRef.current).select('g');
    if (!svg.empty()) {
      svg.selectAll('circle')
        .attr('stroke-width', d => d.zips && d.zips.some(z => hoverZips.has(z)) ? 2 : 0.4)
        .attr('stroke', d => d.zips && d.zips.some(z => hoverZips.has(z)) ? '#000' : '#444');
    }
  }, [hoverZips]);

  //--------------------------------------------------------------------
  // Render
  //--------------------------------------------------------------------
  if (!zipRecords || !muniRecords) return <div>Loading data…</div>;

  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: '6px' }}>
        <label style={{ marginRight: '6px', fontSize: '20px', fontWeight: 'bold' }}>Choropleth metric:</label>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'linear-gradient(180deg,#f9fbff 0%,#e7efff 100%)',
            border: '1px solid #667',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            minWidth: '260px',
            lineHeight: '1.4'
          }}
        >
          <option value="cost">% change rent cost‑burden</option>
          <option value="investor">% change investor share</option>
          <option value="evict">No‑cause evictions (2020–2024 per 100 000 households)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '18px' }}>
        <svg ref={mapRef} width={MAP_W} height={MAP_H} style={{ border: '1px solid #ccc' }} />
        <svg ref={scatterRef} width={SCATTER} height={SCATTER} />
      </div>

      {lockedZips.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <h4>Selected ZIPs</h4>
          <table>
            <thead>
              <tr>
                <th>ZIP</th>
                <th>% Δ cost‑burden</th>
                <th>% Δ investor share</th>
                <th>Evictions per 100 000 HH (2020–2024)</th>
              </tr>
            </thead>
            <tbody>
              {zipRecords.filter(r => lockedZips.includes(r.zip)).map(r => (
                <tr key={r.zip}>
                  <td>{r.zip}</td>
                  <td>{r.costChange != null ? r.costChange.toFixed(1) : 'n/a'}</td>
                  <td>{r.investorChange != null ? r.investorChange.toFixed(1) : 'n/a'}</td>
                  <td>{r.evictions != null ? r.evictions.toFixed(1) : 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: '28px', fontSize: '14px', lineHeight: '1.5' }}>
        <h4 style={{ marginBottom: '8px' }}>Data sources</h4>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>IPUMS NHGIS, ACS 5‑year estimates 2009‑13 (dataset ds201) and 2019‑23 (dataset ds267) for renter cost‑burden metrics citeturn0file0turn0file1</li>
          <li>Massachusetts CHIA <em>2022 ZIP Code List</em> for municipality‑ZIP cross‑walk</li>
          <li>MAPC Regional Residential Sales file (2020‑2024) for use‑code‑filtered purchase counts</li>
          <li>Massachusetts Trial Court Electronic Case Access: no‑cause eviction filings (2020‑2024)</li>
          <li>MAPC <em>Municipalities</em> GeoJSON (simplified) for map polygons</li>
        </ul>
      </div>
    </div>
  );
}

export default HousingDashboard;

import React, { useEffect, useState, createRef, useCallback } from "react";
import mapboxgl             from "mapbox-gl";
import * as d3              from "d3";
import * as turf            from "@turf/turf";
import './RaceElevatedMap.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

/* data ---------------------------------------------------------*/
const CSV_URL = `${process.env.PUBLIC_URL}/demographics/boston_neighborhood_demographics_2010_2020.csv`;
const CORP_CSV_URL = `${process.env.PUBLIC_URL}/scale_data/corp_vs_own_rate.csv`;
const GEO_URL = `${process.env.PUBLIC_URL}/demographics/boston.geojson`;

const RACES = {
  white: { label: "White",            col: "White_per" },
  black: { label: "Black / Afr-Am.",  col: "Black/African American_per" },
  asian: { label: "Asian",            col: "Asian_per" },
  hawpac:{ label: "Pacific Islander", col: "Pacific Islander_per" },
  hisp:  { label: "Hispanic / Latino",col: "Hispanic/Latino_per" },
  two:   { label: "Two or More",      col: "Two or More_per" },
  other: { label: "Other",            col: "Other_per" }
};

const VIEW_PRESETS = {
  TopDown:    { pitch: 0,   bearing: 0,   zoom: 11 },
  AngleView:  { pitch: 55,  bearing: -17, zoom: 11 },
  SideView:   { pitch: 45,  bearing: 90,  zoom: 12 },
};

const NEWS = {
  Allston: {
    snippet: "Average rents for family-size apartments (three-bedrooms) in Allston-Brighton soared 30 % in just two years so a household earning the neighborhood’s median income would now have to devote 63 % of its pay to rent.",
    url: "https://allstonbrightoncdc.org/wp-content/uploads/2019/05/FINAL-Rising-Rents-Closing-Doors-Report.pdf",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/allston.png`,
  },
  Brighton: {
    snippet: "Tenants at the North Beacon Street rehearsal complex must leave so IQHQ can raze it for a life-sciences campus, a pattern artists call ‘Brighton’s Amazon effect.",
    url: "https://www.wbur.org/news/2023/01/10/sound-museum-owners-cry-foul-as-their-tenants-likely-secure-new-spaces-without-them",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/brighton.jpg`,
  },

  Charlestown: {
    snippet: "Residents allege that the corporate manager at Bunker Hill Apartments is using minor lease violations to clear units ahead of a lucrative redevelopment.",
    url: "https://baystatebanner.com/2025/04/02/formerly-incarcerated-black-men-say-they-are-being-targeted-for-eviction-from-charlestown-complex",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/charlestown.jpg`,
  },
  
  "East Boston": {
    snippet: "Investors often bought homes in cash, winning bids over prospective homeowners needing mortgages, and disproportionately driving up rent prices and forcing out tenants in areas such as East Boston with high proportions of low-income families of color, the report found.",
    url: "https://www.boston.com/news/the-boston-globe/2023/12/06/investors-snagged-1-in-5-homes-for-sale-in-greater-boston-worsening-housing-crisis-report-finds/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/east_boston.jpg`,
  },

  Downtown: {
    snippet: "Leasing costs in the Financial District and Downtown now rival Back Bay, pushing small nonprofits and longtime tenants to cheaper suburbs.",
    url: "https://apps.bostonglobe.com/2023/10/special-projects/spotlight-boston-housing/boston-towers-of-wealth/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/downtown.jpg`,
  },

  "Back Bay": {
    snippet: "At One Dalton in Back Bay, shell-company buyers and part-time residents leave floors unoccupied while prices soar, deepening the gap that forces workers to move miles away.",
    url: "https://www.boston.com/news/back-bay-investment",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/back_bay.jpg`,
  },

  "Beacon Hill": {
    snippet: "Tenant advocates say steep rent hikes in Beacon Hill’s 19th-century walk-ups show why corporate landlords fight reforms that might keep long-time residents in place.",
    url: "https://www.bostonglobe.com/2023/04/23/business/rent-control-battle-looms-its-never-been-easy-pass-tenant-protections-beacon-hill",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/beacon_hill.jpg`,
  },

  "Mission Hill": {
    snippet: "Roxbury Tenants of Harvard formed when Harvard Medical School tried to evict dozens on Mission Hill; newer hospital projects still threaten surrounding triple-deckers.",
    url: "https://www.bostonglobe.com/2024/08/17/metro/roxbury-tenants-harvard-was-created-stop-displacement-decades-ago-can-affordable-housing-complex-be-duplicated/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/mission_hill.jpg`,
  },

  "South End": {
    snippet: "Deferred maintenance under a private manager has residents fearing Tent City could be flipped or sold, reviving displacement fights of the 1980s.",
    url: "https://www.bostonglobe.com/2023/01/07/metro/tent-city-once-triumph-community-activism-is-now-home-strife-over-maintenance-security",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/south_end.jpg`,
  },

  "South Boston": {
    snippet: "Advocates cite condo conversions in South Boston triple-deckers where LLC buyers raise rents, then file ‘no-cause’ notices when tenants can’t pay.",
    url: "https://www.bostonglobe.com/2024/05/29/real-estate/renters-hit-with-no-fault-evictions-as-investors-and-corporate-owners-take-hold/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/south_boston.jpg`,
  },

  Dorchester: {
    snippet: "City Life/Vida Urbana says a new landlord at 740 Washington St. is harassing longtime tenants to vacate so apartments can be flipped at higher rents.",
    url: "https://www.dotnews.com/files/Rep%207_21.pdf",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/dorchester.png`,
  },

  Roxbury: {
    snippet: "Beacon Communities filed 113 eviction cases in one Roxbury complex, even naming children in suits — a tactic advocates call ‘weaponizing the courts.’",
    url: "https://baystatebanner.com/2021/06/09/a-rash-of-evictions-in-georgetowne",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/roxbury.jpg`,
  },

  "West Roxbury": {
    snippet: "Analysts warn that investor purchases in West Roxbury’s small-scale rentals are fueling a wave of post-moratorium evictions citywide.",
    url: "https://www.bostonglobe.com/2024/01/18/business/evictions-pandemic-relief-massachusetts",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/west_roxbury.jpg`,
  },
  
  Chinatown: {
    snippet: "Community leaders in Chinatown protest a proposed 25-story tower on Harrison Ave. Community leaders in Chinatown protest a proposed 25-story tower on Harrison Ave. Community leaders in Chinatown protest a proposed 25-story tower on Harrison Ave.",
    url: "https://www.wbur.org/news/2023/02/21/affordable-housing-real-estate-money-neighborhood",
    img: "https://wordpress.wbur.org/wp-content/uploads/2023/02/0131_community-land-trusts03-1000x667.jpg",
  },

  Roslindale: {
    snippet: "State Housing Court data show Roslindale among outer-neighborhood hotspots where corporate notices-to-quit surged after pandemic relief ended.",
    url: "https://www.bostonglobe.com/2024/07/03/real-estate/eviction-takes-toll-more-than-finances/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/roslindale.jpg`,
  },

  "Hyde Park": {
    snippet: "Court filings show a single corporate owner filed over 100 eviction cases in months at Hyde Park complex, a blitz that tenant lawyers fear will scar families’ housing records for years.",
    url: "https://www.bostonglobe.com/2021/06/21/business/more-than-100-eviction-cases-hyde-park-apartment-complex-could-leave-lasting-mark/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/hyde_park.jpg`,
  },
  
  "Jamaica Plain": {
    snippet: "Organizers from JP detailed rent spikes and no-fault evictions after City Realty bought Egleston Square buildings, calling the firm a ‘serial corporate landlord.’",
    url: "https://baystatebanner.com/2014/10/22/city-councilors-hear-testimony-on-city-realty/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/jamaica_plain.jpg`,
  },

  Mattapan: {
    snippet: "A 73-year-old who organized her building’s tenant union argues a corporate buyer is targeting outspoken residents to clear units for higher rent.",
    url: "https://www.bostonglobe.com/2024/10/30/metro/leader-mattapan-tenant-organization-staves-off-evictionfor-now/",
    img: `${process.env.PUBLIC_URL}/demographics/news_images/mattapan.jpg`,
  },
};


/* original palette you preferred ------------------------------*/
const COLOR_POS   = "#4d83b3";   // ↑ positive change (blue)
const COLOR_ZERO  = "#bfbfbf";   // 0 plateau (grey)
const COLOR_NEG   = "#e07a59";   // ↓ negative change (red)

/* simple helper for fill / extrusion colours */
const colorFromDelta = [
  "case",
  ["==", ["get","delta"], null], "#cccccc",
  ["<",  ["get","delta"],   0 ], COLOR_NEG,
  [">",  ["get","delta"],   0 ], COLOR_POS,
  COLOR_ZERO
];

/* exaggeration factor for 3-D height (metres per percentage-point) */
const HEIGHT_SCALE = 150;

export const mapRef  = createRef();         // will hold the <div> container
export const dataRef = { current: null };   // will hold { geo, lookup }

let _selectNeighborhood = null;

export function flyToNeighborhood(name) {
  if (!dataRef.current || !mapRef.current?._map) return;
  const feat = dataRef.current.geo.features.find(f=>f.properties.name===name);
  if (!feat) return;
  _selectNeighborhood?.(feat);
}

export default function RaceElevatedMap() {
  const [raceKey, setRaceKey] = useState("asian");
  const [chosen,  setChosen ] = useState(null);
  const [is3D, setIs3D] = useState(false)

  const flythrough = async names => {
    for (let name of names) {
      flyToNeighborhood(name);
      // wait for camera to settle
      await new Promise(r => setTimeout(r, 2000));
    }
  };

  const handleSelectNeighborhood = useCallback((feat) => {
    const [minX, minY, maxX, maxY] = turf.bbox(feat);
    mapRef.current._map.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 40, duration: 800 }
    );
    setChosen({
      name: feat.properties.name,
      p10: feat.properties.p2010,
      p20: feat.properties.p2020,
      delta: feat.properties.delta,
      corp2010: feat.properties.corp2010,
      corp2020: feat.properties.corp2020,
      snippet: NEWS[feat.properties.name]?.snippet ?? null,
      url: NEWS[feat.properties.name]?.url ?? null,
      imgUrl: NEWS[feat.properties.name]?.img ?? null,
    });
  }, [setChosen]);

  useEffect(() => {
    _selectNeighborhood = handleSelectNeighborhood;
    return () => { _selectNeighborhood = null; };
  }, [handleSelectNeighborhood]);

  /* fetch once ------------------------------------------------*/
  useEffect(() => {
    Promise.all([d3.csv(CSV_URL, d3.autoType), d3.csv(CORP_CSV_URL, d3.autoType), d3.json(GEO_URL)])
      .then(([demoRows, corpRows, geo]) => {
        // 1) demographics lookup
        const demLookup = {};
        demoRows.forEach(d => {
          const nb = d.neighborhood.trim();
          const yr = d.year;
          if (!demLookup[nb]) demLookup[nb] = {};
          if (!demLookup[nb][yr]) demLookup[nb][yr] = {};
          // stash every race in your RACES map for that year:
          for (const raceKey in RACES) {
            demLookup[nb][yr][raceKey] = +d[RACES[raceKey].col];
          }
        });
        
        // 2) corporate‐ownership lookup
        const corpLookup = {};
        corpRows.forEach(d => {
          const nb = d.Neighborhood.trim();
          if (!corpLookup[nb]) corpLookup[nb] = {};
          corpLookup[nb][d.Year] = d.corp * 100;
        });

        dataRef.current = { geo, demLookup, corpLookup };
        setRaceKey("white");               // trigger first build
      });
  }, []);

  /* build / rebuild on race change ---------------------------*/
  useEffect(() => {
    if (!dataRef.current) return;
    const { geo, demLookup, corpLookup} = dataRef.current;

    /* clone so we can mutate ---------------------------------*/
    const g = JSON.parse(JSON.stringify(geo));
    g.features.forEach(f => {
      const nb   = f.properties.name.trim();
      const p10  = demLookup[nb]?.[2010]?.[raceKey] ?? null;
      const p20  = demLookup[nb]?.[2020]?.[raceKey] ?? null;

      f.properties.p2010   = p10;
      f.properties.p2020   = p20;
      f.properties.delta   = (p10!=null && p20!=null) ? +(p20-p10).toFixed(2) : null;
      f.properties.height  = f.properties.delta==null ? 0 : Math.abs(f.properties.delta)*HEIGHT_SCALE;
      f.properties.corp2010 = corpLookup[nb]?.[2010] ?? null;
      f.properties.corp2020 = corpLookup[nb]?.[2020] ?? null;
    });

    mapRef.current?._map && mapRef.current._map.remove();
    dataRef.current.geo = g;  // update reference

    const initView = is3D
    ? VIEW_PRESETS.AngleView
    : VIEW_PRESETS.TopDown;

    const map = new mapboxgl.Map({
      container : mapRef.current,
      style     : "mapbox://styles/mapbox/light-v11",
      center    : [-71.06, 42.32],
      zoom      : initView.zoom,
      pitch     : initView.pitch,
      bearing   : initView.bearing
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    const deltas = g.features.map(f => Math.abs(f.properties.delta) || 0);
    const maxDelta = Math.max(...deltas, 0);

    // pick your light & dark end‐colours:
    const darkRed  = "#c0392b";
    const neutral  = "#bfbfbf";
    const darkBlue = "#2e86c1";

    // build an interpolate expression
    const colorExpression = [
      "interpolate", ["linear"],
        ["get", "delta"],
        -maxDelta, COLOR_NEG,
          0,       neutral,
        maxDelta, COLOR_POS
    ];

    map.on("load", () => {
      map.addSource("neigh", { type:"geojson", data:g });

      /* coloured, flat fill ----------------------------------*/
      map.addLayer({
        id:"fill", type:"fill", source:"neigh",
        paint:{ "fill-color": colorFromDelta, "fill-opacity":0.88 }
      });

      map.addLayer({            /* outline */
        id:"outline", type:"line", source:"neigh",
        paint:{ "line-color":"#222", "line-width":0.4 }
      });

      map.addLayer({            /* 3-D extrusion */
        id:"extrude", type:"fill-extrusion", source:"neigh", minzoom:9,
        paint:{
          "fill-extrusion-color" : colorExpression,
          "fill-extrusion-base"  : 0,
          "fill-extrusion-opacity": 0.8,
          "fill-extrusion-height": is3D
          ? ["get", "height"]
          : 0
        }
      });

      /* tooltip ----------------------------------------------*/
      const tip = new mapboxgl.Popup({closeButton:false,closeOnClick:false});
      map.on("mousemove","fill", e=>{
        const f = e.features[0];
        map.getCanvas().style.cursor="pointer";
        tip.setLngLat(e.lngLat).setHTML(`
          <strong>${f.properties.name}</strong><br/>
          2010: ${f.properties.p2010==null?"n/a":f.properties.p2010+"%"}<br/>
          2020: ${f.properties.p2020==null?"n/a":f.properties.p2020+"%"}<br/>
          Δ&nbsp;10→20: ${f.properties.delta==null?"n/a":
            (f.properties.delta>0?"+":"")+f.properties.delta+" Δ%"}
        `).addTo(map);
      });
      map.on("mouseleave","fill", ()=>{
        map.getCanvas().style.cursor="";
        tip.remove();
      });

      /* click – zoom + card ----------------------------------*/
      map.on("click","fill", e=>{
        handleSelectNeighborhood(e.features[0]);
      });
    });

    mapRef.current._map = map;
  }, [raceKey]);

  /* sync card when race changes ------------------------------*/
  useEffect(() => {
    if (!chosen || !dataRef.current) return;
    const { demLookup, corpLookup } = dataRef.current;
    const nb = chosen.name;
    setChosen({
      name : nb,
      p10  : demLookup[nb]?.[2010]?.[raceKey] ?? null,
      p20  : demLookup[nb]?.[2020]?.[raceKey] ?? null,
      delta: (demLookup[nb]?.[2010]?.[raceKey]!=null &&
              demLookup[nb]?.[2020]?.[raceKey]!=null)
              ? +(demLookup[nb][2020][raceKey]-demLookup[nb][2010][raceKey]).toFixed(2)
              : null,
      corp2010: corpLookup[nb]?.[2010] ?? null,
      corp2020: corpLookup[nb]?.[2020] ?? null,
      snippet: NEWS[nb]?.snippet ?? null,
      url: NEWS[nb]?.url ?? null,
      imgUrl: NEWS[nb]?.img ?? null,
    });
  }, [raceKey]);

  useEffect(() => {
    const map = mapRef.current?._map;
    if (!map || !map.getLayer("extrude")) return;
  
    if (is3D) {
      // 1) lift the bars
      map.setPaintProperty("extrude", "fill-extrusion-height", ["get", "height"]);
      // 2) fly to the angled view
      map.flyTo({ 
        ...VIEW_PRESETS.AngleView,
        duration: 800
      });
    } else {
      // 1) collapse the bars flat again
      map.setPaintProperty("extrude", "fill-extrusion-height", 0);
      // 2) fly to the top‐down view
      map.flyTo({
        ...VIEW_PRESETS.TopDown,
        duration: 800
      });
    }
  }, [is3D])

  useEffect(() => {
    const map = mapRef.current?._map;
    if (!map) return;
  
    // if chosen was just cleared, fly back to your “init view”
    if (chosen === null) {
      const init = is3D
        ? VIEW_PRESETS.AngleView
        : VIEW_PRESETS.TopDown;
      map.flyTo({
        ...init,
        duration: 800
      });
    }
  }, [chosen, is3D]);
  

  /* UI --------------------------------------------------------*/
  return (
    <>
      {/* 1) View-mode toggle */}
      {/* <div className="view-mode-toggle">
        <label>
          <input
            type="checkbox"
            checked={is3D}
            onChange={() => setIs3D(v => !v)}
          />
          3D bars
        </label>
      </div> */}

      {/* <button onClick={() => flythrough(["Beacon Hill","Back Bay","Roxbury"])}>
        Start Flythrough
      </button> */}

      <div className="race-picker" id="race">
        <label htmlFor="race-select" style={{ marginRight: "10px" }}>
          Demographic Selection:
        </label>
        <select
          id="race-select"
          value={raceKey}
          onChange={(e) => setRaceKey(e.target.value)}
        >
          {Object.entries(RACES).map(([k, { label }]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
  
      <p style={{ textAlign: "center" }}>
        {RACES[raceKey].label} — Change 2010 to 2020
      </p>
  
      <label className={`pill-toggle ${is3D ? "on" : ""}`}>
        <input
          type="checkbox"
          checked={is3D}
          onChange={() => setIs3D(v => !v)}
        />
        3-D bars
      </label>

      <div className="map-row" style={{ position: "relative" }}>
        <div className="map-box" ref={mapRef}>
          <div className="map-legend">
            <div><span className="swatch pos"></span> Δ &gt; 0 (% gain pop)</div>
            <div><span className="swatch zero"></span> Δ = 0</div>
            <div><span className="swatch neg"></span> Δ &lt; 0 (% loss pop)</div>
            <div className="scale-note">Height: Magnitude of % change of population</div>
          </div>

          <div className="view-presets">
            {Object.entries(VIEW_PRESETS).map(([key, cfg]) => (
              <button
                key={key}
                className="pill"
                onClick={() => mapRef.current._map.flyTo(cfg)}
              >
                {key}
              </button>
            ))}
            <button className="pill" onClick={() => mapRef.current._map.setPitch(
                mapRef.current._map.getPitch() + 10, { duration: 600 })}>
              Tilt +10°
            </button>
            <button className="pill" onClick={() => mapRef.current._map.setPitch(
                mapRef.current._map.getPitch() - 10, { duration: 600 })}>
              Tilt -10°
            </button>
          </div>
          
        </div>

        {chosen && (
          <div className="info-card single-pane">
            <div className="info-card-header">
              <span className="x" onClick={() => setChosen(null)}>✕</span>
              <h3>{chosen.name}</h3>
            </div>

            <div className="info-card-body">
              <p>
                <strong>2010:</strong> {chosen.p10 == null ? "n/a" : chosen.p10 + "%"}
              </p>
              <p>
                <strong>2020:</strong> {chosen.p20 == null ? "n/a" : chosen.p20 + "%"}
              </p>
              <p>
                <strong>Δ 10→20:</strong>
                {chosen.delta == null
                  ? "n/a"
                  : (chosen.delta > 0 ? " +" : " ") + chosen.delta + " Δ%"}
              </p>

              <p>
                <strong>Corp Ownership 2010:</strong>
                {chosen.corp2010 == null ? " Unavailable" : ` ${chosen.corp2010.toFixed(0)}%`}
              </p>

              <p>
                <strong>Corp Ownership 2020:</strong>
                {chosen.corp2020 == null ? " Unavailable" : ` ${chosen.corp2020.toFixed(0)}%`}
              </p>
              
              <p>
                <strong>Change in Corp Ownership:</strong>
                {chosen.corp2010 == null || chosen.corp2020 == null
                  ? " Unavailable"
                  : ` ${(chosen.corp2020 - chosen.corp2010).toFixed(0)}%`}
              </p>

              {/* 2) new article image */}
              {chosen.imgUrl && (
                <img
                  src={chosen.imgUrl}
                  alt={`${chosen.name} snapshot`}
                  style={{
                    width: "100%",
                    height: "auto",
                    marginTop:  "1.5rem",
                    marginBottom: "0.25rem",
                    borderRadius: "4px",
                    objectFit: "cover"
                  }}
                />
              )}

              {/* 3) new article snippet */}
              {chosen.snippet && (
                <div style={{ marginTop: "1rem", fontStyle: "italic" }}>
                  “{chosen.snippet}”
                  {chosen.url && (
                    <div>
                      <a href={chosen.url} target="_blank" rel="noopener noreferrer">
                        Read more
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

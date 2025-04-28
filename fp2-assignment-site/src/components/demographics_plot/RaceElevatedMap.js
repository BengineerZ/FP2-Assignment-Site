// import React, { useEffect, useRef, useState } from "react";
// import mapboxgl                     from "mapbox-gl";
// import * as turf                    from "@turf/turf";
// import * as d3                      from "d3";

// mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

// /* ──────────────────────────────────────────────────────────────
//    FILE URLS
//    ──────────────────────────────────────────────────────────────*/
// const CSV_URL = `${process.env.PUBLIC_URL}/demographics/boston_neighborhood_demographics_2010_2020.csv`;
// const GEO_URL = `${process.env.PUBLIC_URL}/demographics/boston.geojson`;

// /* ──────────────────────────────────────────────────────────────
//    RACE  →  { label, csv column }
//    ──────────────────────────────────────────────────────────────*/
// const RACES = {
//   white: { label: "White",            col: "White_per" },
//   black: { label: "Black / Afr-Am.",  col: "Black/African American_per" },
//   asian: { label: "Asian",            col: "Asian_per" },
//   hawpac:{ label: "Pacific Islander", col: "Pacific Islander_per" },
//   hisp:  { label: "Hispanic / Latino",col: "Hispanic/Latino_per" },
//   two:   { label: "Two or More",      col: "Two or More_per" },
//   other: { label: "Other",            col: "Other_per" }
// };

// /* colour scale 0 → 100 % */
// const colour = v => v == null ? "#ccc" : d3.interpolateBlues(v / 100);

// /* exaggeration factor for 3-D height (metres per percentage-point) */
// const HEIGHT_SCALE = 150;          // tweak for desired dramatic effect

// export default function RaceElevatedMap() {
//   /* UI state ----------------------------------------------------*/
//   const [raceKey, setRaceKey] = useState("white");
//   const [chosen,  setChosen ]  = useState(null);

//   /* map DOM refs -----------------------------------------------*/
//   const leftRef  = useRef(null);  // 2010
//   const rightRef = useRef(null);  // 2020

//   /* fetched data cache -----------------------------------------*/
//   const dataRef  = useRef(null);  // { geo, lookup }

//   /* ────────────────────────────────────────────────────────────
//      1 ▸ fetch CSV + GeoJSON once
//      ────────────────────────────────────────────────────────────*/
//   useEffect(() => {
//     Promise.all([d3.csv(CSV_URL, d3.autoType), d3.json(GEO_URL)])
//       .then(([csv, geo]) => {
//         const lookup = {};
//         csv.forEach(d => {
//           const nb = d.neighborhood.trim();
//           if (!lookup[nb]) lookup[nb] = {};
//           if (!lookup[nb][d.year]) lookup[nb][d.year] = {};
//           for (const k in RACES) lookup[nb][d.year][k] = +d[RACES[k].col];
//         });
//         dataRef.current = { geo, lookup };
//         setRaceKey(k => k);          // kick first render
//       });
//   }, []);

//   /* ────────────────────────────────────────────────────────────
//      2 ▸ (re)build both maps whenever the selected race changes
//      ────────────────────────────────────────────────────────────*/
//   useEffect(() => {
//     if (!dataRef.current) return;
//     const { geo, lookup } = dataRef.current;

//     /* deep clone GeoJSON because we mutate feature properties   */
//     const g = JSON.parse(JSON.stringify(geo));

//     g.features.forEach(f => {
//       const nb   = f.properties.name.trim();
//       const pct10= lookup[nb]?.[2010]?.[raceKey] ?? null;
//       const pct20= lookup[nb]?.[2020]?.[raceKey] ?? null;

//       f.properties.v2010   = pct10;
//       f.properties.v2020   = pct20;
//       f.properties.delta   = (pct10 != null && pct20 != null)
//                                ? +(pct20 - pct10).toFixed(2)
//                                : null;                  // +↑  –↓
//       f.properties.absDelta= f.properties.delta == null
//                                ? null
//                                : Math.abs(f.properties.delta);
//       f.properties.height  = f.properties.absDelta == null
//                                ? 0
//                                : f.properties.absDelta * HEIGHT_SCALE;
//     });

//     /* -- clean up any previous maps --*/
//     leftRef.current?._map  && leftRef.current._map.remove();
//     rightRef.current?._map && rightRef.current._map.remove();

//     const defaultView = { center:[-71.06,42.32], zoom:11 };

//     /* helper – build one map (yearKey = v2010 | v2020) ----------*/
//     const buildMap = (container, yearKey, yearLabel) => {

//       const map = new mapboxgl.Map({
//         container,
//         style: "mapbox://styles/mapbox/light-v11",
//         ...defaultView
//       });

//       map.on("load", () => {
//         map.addSource("neigh", { type:"geojson", data:g });

//         /* coloured 2-D fill (flat) */
//         map.addLayer({
//           id: "fill",
//           type: "fill",
//           source: "neigh",
//           paint: {
//             "fill-color": [
//               "case",
//               ["==", ["get", yearKey], null], "#cccccc",
//               ["interpolate", ["linear"], ["get", yearKey],
//                 0, colour(0),
//                 100, colour(100)]
//             ],
//             "fill-opacity": 0.9
//           }
//         });

//         /* thin outline */
//         map.addLayer({
//           id: "outline",
//           type: "line",
//           source: "neigh",
//           paint:{ "line-color": "#333", "line-width": 0.4 }
//         });

//         /* 3-D extrusion – sits *below* labels */
//         map.addLayer({
//           id: "extrude",
//           type: "fill-extrusion",
//           source: "neigh",
//           minzoom: 9,
//           paint:{
//             "fill-extrusion-color": [
//               "case",
//               ["<", ["get","delta"], 0], "#e07a59",   // ↓ negative change → warm
//               ["==", ["get","delta"],0], "#bfbfbf",   // 0  → grey plateau
//               "#4d83b3"                               // ↑ positive      → cool
//             ],
//             "fill-extrusion-height": ["get","height"],
//             "fill-extrusion-base":    0,
//             "fill-extrusion-opacity": 0.75
//           }
//         });

//         /* popup on hover */
//         const popup = new mapboxgl.Popup({ closeButton:false, closeOnClick:false });
//         map.on("mousemove","fill", e => {
//           const f = e.features[0];
//           map.getCanvas().style.cursor = "pointer";
//           popup.setLngLat(e.lngLat).setHTML(`
//             <strong>${f.properties.name}</strong><br/>
//             ${yearLabel}: ${f.properties[yearKey] == null ? "n/a" : f.properties[yearKey] + "%"}<br/>
//             Δ 2010-20: ${f.properties.delta == null ? "n/a" : (f.properties.delta > 0 ? "+" : "") + f.properties.delta + " pp"}
//           `).addTo(map);
//         });
//         map.on("mouseleave","fill", () => {
//           map.getCanvas().style.cursor = "";
//           popup.remove();
//         });

//         /* click → zoom and info-cards */
//         map.on("click","fill", e => {
//           const f = e.features[0];
//           zoomBoth(f);
//           setChosen({
//             name : f.properties.name,
//             v10  : f.properties.v2010,
//             v20  : f.properties.v2020,
//             delta: f.properties.delta
//           });
//         });
//       });

//       container._map = map;
//       return map;
//     };

//     /* both maps -----------------------------------------------*/
//     const m2010 = buildMap(leftRef.current,  "v2010", "2010");
//     const m2020 = buildMap(rightRef.current, "v2020", "2020");

//     /* keep refs for later zoom / reset ------------------------*/
//     leftRef.current._map  = m2010;
//     rightRef.current._map = m2020;

//     const zoomBoth = feature => {
//       const [minX,minY,maxX,maxY] = turf.bbox(feature);
//       const bounds = [[minX,minY],[maxX,maxY]];
//       const opts   = { padding:40, duration:600 };
//       m2010.fitBounds(bounds, opts);
//       m2020.fitBounds(bounds, opts);
//     };
//   }, [raceKey]);

//   /* keep info-cards in sync when race changes ------------------*/
//   useEffect(() => {
//     if (!chosen || !dataRef.current) return;
//     const { lookup } = dataRef.current;
//     const nb = chosen.name;
//     setChosen({
//       name : nb,
//       v10  : lookup[nb]?.[2010]?.[raceKey] ?? null,
//       v20  : lookup[nb]?.[2020]?.[raceKey] ?? null,
//       delta: ( lookup[nb]?.[2010]?.[raceKey] != null &&
//                lookup[nb]?.[2020]?.[raceKey] != null )
//                ? +(lookup[nb][2020][raceKey] -
//                    lookup[nb][2010][raceKey]).toFixed(2)
//                : null
//     });
//   }, [raceKey]);

//   /* ────────────────────────────────────────────────────────────
//      RENDER
//      ────────────────────────────────────────────────────────────*/
//   return (
//     <>
//       {/* drop-down menu */}
//       <div className="race-picker">
//         <select value={raceKey} onChange={e => setRaceKey(e.target.value)}>
//           {Object.entries(RACES).map(([k,{label}]) =>
//             <option key={k} value={k}>{label}</option>)}
//         </select>
//       </div>

//       <h2 style={{textAlign:"center"}}>
//         {RACES[raceKey].label} Population Share — 2010 vs 2020
//       </h2>

//       {/* two maps + cards */}
//       <div className="map-row">
//         <div className="map-box" ref={leftRef} />
//         <div className="map-box" ref={rightRef} />

//         {chosen && <>
//           {/* left card – 2010 */}
//           <div className="info-card left-pane">
//             <span className="x" onClick={() => setChosen(null)}>✕</span>
//             <h3>{chosen.name}</h3>
//             <p><strong>2010:</strong> {chosen.v10 == null ? "n/a" : chosen.v10 + "%"}</p>
//             <p><strong>Δ&nbsp;10 → 20:</strong> {
//               chosen.delta == null ? "n/a"
//               : (chosen.delta > 0 ? "+" : "") + chosen.delta + " pp"
//             }</p>
//           </div>

//           {/* right card – 2020 */}
//           <div className="info-card right-pane">
//             <span className="x" onClick={() => setChosen(null)}>✕</span>
//             <h3>{chosen.name}</h3>
//             <p><strong>2020:</strong> {chosen.v20 == null ? "n/a" : chosen.v20 + "%"}</p>
//             <p><strong>Δ&nbsp;10 → 20:</strong> {
//               chosen.delta == null ? "n/a"
//               : (chosen.delta > 0 ? "+" : "") + chosen.delta + " pp"
//             }</p>
//           </div>
//         </>}
//       </div>
//     </>
//   );
// }


import React, { useEffect, useRef, useState } from "react";
import mapboxgl             from "mapbox-gl";
import * as d3              from "d3";
import * as turf            from "@turf/turf";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

/* data ---------------------------------------------------------*/
const CSV_URL = `${process.env.PUBLIC_URL}/demographics/boston_neighborhood_demographics_2010_2020.csv`;
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

export default function RaceElevatedMap() {

  const [raceKey, setRaceKey] = useState("asian");
  const [chosen,  setChosen ] = useState(null);

  const mapRef  = useRef(null);
  const dataRef = useRef(null);         // cache { geo, lookup }

  /* fetch once ------------------------------------------------*/
  useEffect(() => {
    Promise.all([d3.csv(CSV_URL, d3.autoType), d3.json(GEO_URL)])
      .then(([csv, geo]) => {
        const lookup = {};
        csv.forEach(d => {
          const nb = d.neighborhood.trim();
          if (!lookup[nb]) lookup[nb] = {};
          if (!lookup[nb][d.year]) lookup[nb][d.year] = {};
          for (const k in RACES) lookup[nb][d.year][k] = +d[RACES[k].col];
        });
        dataRef.current = { geo, lookup };
        setRaceKey("white");               // trigger first build
      });
  }, []);

  /* build / rebuild on race change ---------------------------*/
  useEffect(() => {
    if (!dataRef.current) return;
    const { geo, lookup } = dataRef.current;

    /* clone so we can mutate ---------------------------------*/
    const g = JSON.parse(JSON.stringify(geo));
    g.features.forEach(f => {
      const nb   = f.properties.name.trim();
      const p10  = lookup[nb]?.[2010]?.[raceKey] ?? null;
      const p20  = lookup[nb]?.[2020]?.[raceKey] ?? null;

      f.properties.p2010   = p10;
      f.properties.p2020   = p20;
      f.properties.delta   = (p10!=null && p20!=null) ? +(p20-p10).toFixed(2) : null;
      f.properties.height  = f.properties.delta==null ? 0 : Math.abs(f.properties.delta)*HEIGHT_SCALE;
    });

    mapRef.current?._map && mapRef.current._map.remove();

    const map = new mapboxgl.Map({
      container : mapRef.current,
      style     : "mapbox://styles/mapbox/light-v11",
      center    : [-71.06, 42.32],
      zoom      : 11,
      pitch     : 55,      // ← tilt
      bearing   : -17
    });

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
          "fill-extrusion-color" : colorFromDelta,
          "fill-extrusion-height": ["get","height"],
          "fill-extrusion-base"  : 0,
          "fill-extrusion-opacity": 0.8
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
        const f = e.features[0];
        const [minX,minY,maxX,maxY] = turf.bbox(f);
        map.fitBounds([[minX,minY],[maxX,maxY]], {padding:40,duration:600});
        setChosen({
          name : f.properties.name,
          p10  : f.properties.p2010,
          p20  : f.properties.p2020,
          delta: f.properties.delta
        });
      });
    });

    mapRef.current._map = map;
  }, [raceKey]);

  /* sync card when race changes ------------------------------*/
  useEffect(() => {
    if (!chosen || !dataRef.current) return;
    const { lookup } = dataRef.current;
    const nb = chosen.name;
    setChosen({
      name : nb,
      p10  : lookup[nb]?.[2010]?.[raceKey] ?? null,
      p20  : lookup[nb]?.[2020]?.[raceKey] ?? null,
      delta: (lookup[nb]?.[2010]?.[raceKey]!=null &&
              lookup[nb]?.[2020]?.[raceKey]!=null)
              ? +(lookup[nb][2020][raceKey]-lookup[nb][2010][raceKey]).toFixed(2)
              : null
    });
  }, [raceKey]);

  /* UI --------------------------------------------------------*/
  return (
    <>
      <div className="race-picker">
        <select value={raceKey} onChange={e=>setRaceKey(e.target.value)}>
          {Object.entries(RACES).map(([k,{label}]) =>
            <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      <h2 style={{textAlign:"center"}}>
        {RACES[raceKey].label} — Change 2010 to 2020
      </h2>

      <div className="map-row" style={{position:"relative"}}>
        <div className="map-box" ref={mapRef} />

        {chosen && (
          <div className="info-card single-pane">
            <span className="x" onClick={()=>setChosen(null)}>✕</span>
            <h3>{chosen.name}</h3>
            <p><strong>2010:</strong> {chosen.p10==null?"n/a":chosen.p10+"%"}</p>
            <p><strong>2020:</strong> {chosen.p20==null?"n/a":chosen.p20+"%"}</p>
            <p><strong>Δ 10→20:</strong>{
              chosen.delta==null?"n/a":
              (chosen.delta>0?"+":"")+chosen.delta+" Δ%"
            }</p>
          </div>
        )}
      </div>
    </>
  );
}

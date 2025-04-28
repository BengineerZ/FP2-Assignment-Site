import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf"; 
import * as d3 from "d3";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const CSV_URL = `${process.env.PUBLIC_URL}/boston_neighborhood_demographics_2010_2020.csv`;
const GEO_URL = `${process.env.PUBLIC_URL}/boston.geojson`;

/* menu -> { label, csvSuffix }  */
const RACES = {
  white: { label: "White",                col: "White_per" },
  black: { label: "Black / Afr.-Am.",     col: "Black/African American_per" },
  asian: { label: "Asian",                col: "Asian_per" },
  hawpac:{ label: "Pacific Islander",     col: "Pacific Islander_per" },
  hisp:  { label: "Hispanic / Latino",    col: "Hispanic/Latino_per" },
  two:   { label: "Two or More",          col: "Two or More_per" },
  other: { label: "Other",                col: "Other_per" }
};

const colour = v => v == null ? "#ccc" : d3.interpolateBlues(v / 100);

export default function RaceSideBySide() {
  const [raceKey, setRaceKey] = useState("white");     // menu state
  const [chosen,  setChosen]  = useState(null); 

  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  /* ------------------------------------------- */
  /* fetch data ONCE                              */
  /* ------------------------------------------- */
  const dataRef = useRef(null);   // { geo, csvLookup }
  useEffect(() => {
    Promise.all([d3.csv(CSV_URL, d3.autoType), d3.json(GEO_URL)]).then(
      ([csv, geo]) => {
        /* build { nbhd -> {year -> { race -> % }} } */
        const lookup = {};
        csv.forEach(d => {
          const nb = d.neighborhood.trim();
          if (!lookup[nb]) lookup[nb] = {};
          if (!lookup[nb][d.year]) lookup[nb][d.year] = {};
          for (const key in RACES) {
            lookup[nb][d.year][key] = +d[RACES[key].col];
            // lookup[nb][d.year][key] = {
            //     pct : +d[RACES[key].col],               // already there
            //     cnt : +d[ RACES[key].col.replace("_per","") ]   // ← grab raw number
            // };
          }
        });
        dataRef.current = { geo, lookup };
        // trigger initial render by switching race (no-op)
        setRaceKey(raceKey => raceKey);
      }
    );
  }, []);

  /* ------------------------------------------- */
  /* build / rebuild maps whenever race changes   */
  /* ------------------------------------------- */
  useEffect(() => {
    if (!dataRef.current) return;
    const { geo, lookup } = dataRef.current;

    /* deep-clone geometry so we can mutate safely */
    const geoCopy = JSON.parse(JSON.stringify(geo));

    geoCopy.features.forEach(f => {
      const nb = f.properties.name.trim();
      f.properties.v2010 = lookup[nb]?.[2010]?.[raceKey] ?? null;
      f.properties.v2020 = lookup[nb]?.[2020]?.[raceKey] ?? null;
    });

    /* destroy previous maps if any */
    let m10 = leftRef.current?._map, m20 = rightRef.current?._map;
    m10 && m10.remove(); m20 && m20.remove();

    let map1 = null;   // 2010 pane
    let map2 = null;   // 2020 pane

    /* helper */
    const zoomBoth = (feature, map1, map2) => {
        const [minX,minY,maxX,maxY] = turf.bbox(feature);       // turf.js bbox
        const bounds = [[minX,minY],[maxX,maxY]];
        const opts   = { padding: 40, duration: 600 };
        map1.fitBounds(bounds, opts);
        map2.fitBounds(bounds, opts);
      };
    
    const defaultView = { center:[-71.06,42.32], zoom:11 };

    /* helper */
    const initMap = (container, prop, yearLabel) => {
      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-71.06, 42.32],
        zoom: 11
      });
      map.on("load", () => {
        map.addSource("s", { type: "geojson", data: geoCopy });
        map.addLayer({
          id: "f",
          type: "fill",
          source: "s",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", prop], null], "#ccc",
              ["interpolate", ["linear"], ["get", prop],
               0, colour(0),
               100, colour(100)]
            ],
            "fill-opacity": 0.85,
            "fill-outline-color": "#555"
          }
        });
        map.addLayer({
          id: "l",
          type: "line",
          source: "s",
          paint: { "line-color":"#111", "line-width":1 }
        });
        const popup = new mapboxgl.Popup({closeButton:false,closeOnClick:false});
        map.on("mousemove","f",e=>{
          const f=e.features[0];
          map.getCanvas().style.cursor="pointer";
          popup.setLngLat(e.lngLat).setHTML(
            `<strong>${f.properties.name}</strong><br/>
             ${yearLabel}: ${f.properties[prop]==null?"n/a":f.properties[prop]+"%"}`
          ).addTo(map);
        });
        map.on("mouseleave","f",()=>{map.getCanvas().style.cursor=""; popup.remove();});
        
        // click -> choose neighbourhood
        map.on("click","f", e => {
          const f = e.features[0];
          setChosen({
            name: f.properties.name,
            v10 : f.properties.v2010,
            v20 : f.properties.v2020,
            geo : f                               // store for bbox
          });
          zoomBoth(f, leftRef.current._map, rightRef.current._map);
        });
        map.on("click", e => {
        // if no feature under cursor -> reset
        if (!map.queryRenderedFeatures(e.point, { layers:["f"] }).length) {
            setChosen(null);
            map1 && map1.flyTo({center:[-71.06,42.32], zoom:11});
            map2 && map2.flyTo({center:[-71.06,42.32], zoom:11});
        }
        });
          
      });
      // tuck a reference so we can kill it later
      container._map = map;
      return map;
    };

    map1 = initMap(leftRef.current,  "v2010", "2010");
    map2 = initMap(rightRef.current, "v2020", "2020");
  }, [raceKey]);

  /* ------------------------------------------------------------ */
  /* 3 ▸ if race changes while a neighbourhood is chosen, update  */
  /* ------------------------------------------------------------ */
  useEffect(() => {            // NEW
    if (!chosen || !dataRef.current) return;
    const { lookup } = dataRef.current;
    const nb = chosen.name;
    setChosen({
      ...chosen,
      v10: lookup[nb]?.[2010]?.[raceKey] ?? null,
      v20: lookup[nb]?.[2020]?.[raceKey] ?? null
    });
  }, [raceKey]);               // NEW


  /* ------------------------------------------- */
  return (
    <>
      <div className="race-picker">
        <select value={raceKey} onChange={e=>setRaceKey(e.target.value)}>
          {Object.entries(RACES).map(([key,{label}]) =>
            <option key={key} value={key}>{label}</option>
          )}
        </select>
      </div>

      <h2 style={{textAlign:"center"}}>
        {RACES[raceKey].label} Population Share — 2010&nbsp;vs&nbsp;2020
      </h2>

      <div className="map-row">
        <div className="map-box" ref={leftRef}  />
        <div className="map-box" ref={rightRef} />

        {/* {chosen && (
            <div className="info-card">
            <span className="x" onClick={()=>setChosen(null)}>✕</span>
            <h3>{chosen.name}</h3>
            <p><strong>2010:</strong> {chosen.v10 == null ? "n/a" : chosen.v10 + "%"}</p>
            <p><strong>2020:</strong> {chosen.v20 == null ? "n/a" : chosen.v20 + "%"}</p>
            </div>
        )} */}

        {chosen && (
            <>
            {/* 2010 card (left) */}
            <div className="info-card left-pane">
                <span className="x" onClick={() => setChosen(null)}>✕</span>
                <h3>{chosen.name}</h3>
                <p><strong>2010</strong></p>
                {/* <p>{chosen.v10.cnt.toLocaleString()} people</p> */}
                {/* <p>{chosen.v10.pct.toFixed(2)} %</p> */}
                <p>{chosen.v10 == null ? "n/a" : chosen.v10 + "%"}</p>
            </div>

            {/* 2020 card (right) */}
            <div className="info-card right-pane">
                <span className="x" onClick={() => setChosen(null)}>✕</span>
                <h3>{chosen.name}</h3>
                <p><strong>2020</strong></p>
                {/* <p>{chosen.v20.cnt.toLocaleString()} people</p> */}
                {/* <p>{chosen.v20.pct.toFixed(2)} %</p> */}
                <p>{chosen.v20 == null ? "n/a" : chosen.v20 + "%"}</p>
            </div>
            </>
        )}
      </div>
    </>
  );
}

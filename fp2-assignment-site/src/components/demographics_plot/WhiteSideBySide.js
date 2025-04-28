import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as d3 from "d3";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const CSV_URL = `${process.env.PUBLIC_URL}/boston_neighborhood_demographics_2010_2020.csv`;
const GEO_URL = `${process.env.PUBLIC_URL}/boston.geojson`;

/* sequential blue 0–100 % */
const colour = v => v == null ? "#ccc" : d3.interpolateBlues(v / 100);

export default function WhiteSideBySide() {
  const leftRef  = useRef(null);   // 2010 map container
  const rightRef = useRef(null);   // 2020 map container

  useEffect(() => {
    let map2010, map2020;

    Promise.all([d3.csv(CSV_URL, d3.autoType), d3.json(GEO_URL)])
      .then(([csv, geo]) => {
        /* ---- 1 ▸ build lookup { nbhd → {2010,2020} } ---- */
        const lookup = {};
        csv.forEach(d => {
          const nb = d.neighborhood.trim();
          if (!lookup[nb]) lookup[nb] = {};
          lookup[nb][d.year] = +d.White_per;
        });

        /* ---- 2 ▸ add both years to each feature ---- */
        geo.features.forEach(f => {
          const nb = f.properties.name.trim();
          f.properties.white10 = lookup[nb]?.[2010] ?? null;
          f.properties.white20 = lookup[nb]?.[2020] ?? null;
        });

        /* ---- helper to init a map for a given year key ---- */
        const initMap = (container, yearKey, yearLabel) => {
          const map = new mapboxgl.Map({
            container,
            style: "mapbox://styles/mapbox/light-v11",
            center: [-71.06, 42.32],
            zoom: 11
          });

          map.on("load", () => {
            const srcId = `src-${yearKey}`;
            const fillId = `fill-${yearKey}`;
            const lineId = `line-${yearKey}`;

            map.addSource(srcId, { type: "geojson", data: geo });

            map.addLayer({
              id: fillId,
              type: "fill",
              source: srcId,
              paint: {
                "fill-color": [
                  "case",
                  ["==", ["get", yearKey], null], "#cccccc",
                  ["interpolate", ["linear"], ["get", yearKey],
                    0, colour(0),
                    100, colour(100)
                  ]
                ],
                "fill-opacity": 0.85,
                "fill-outline-color": "#444"
              }
            });

            map.addLayer({
              id: lineId,
              type: "line",
              source: srcId,
              paint: { "line-color": "#111", "line-width": 1 }
            });

            /* popup */
            const popup = new mapboxgl.Popup({ closeButton:false, closeOnClick:false });

            map.on("mousemove", fillId, e => {
              const f = e.features[0];
              map.getCanvas().style.cursor = "pointer";
              popup
                .setLngLat(e.lngLat)
                .setHTML(
                  `<strong>${f.properties.name}</strong><br/>
                   White (${yearLabel}): ${
                     f.properties[yearKey] == null ? "n/a"
                     : f.properties[yearKey] + "%"
                   }`
                )
                .addTo(map);
            });
            map.on("mouseleave", fillId, () => {
              map.getCanvas().style.cursor = "";
              popup.remove();
            });
          });

          return map;
        };

        map2010 = initMap(leftRef.current,  "white10", "2010");
        map2020 = initMap(rightRef.current, "white20", "2020");
      });

    return () => {
      map2010 && map2010.remove();
      map2020 && map2020.remove();
    };
  }, []);

  return (
    <>
      <h2 style={{textAlign:"center"}}>White Population Share — 2010 vs 2020</h2>
      <div className="map-row">
        <div className="map-box" ref={leftRef} />
        <div className="map-box" ref={rightRef} />
      </div>
    </>
  );
}

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as d3 from "d3";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const CSV_URL = `${process.env.PUBLIC_URL}/boston_neighborhood_demographics_2010_2020.csv`;
const GEO_URL = `${process.env.PUBLIC_URL}/boston.geojson`;

/* sequential blue 0→100 % */
const colour = v => v == null ? "#ccc" : d3.interpolateBlues(v / 100);

export default function White2010Map() {
  const mapNode = useRef(null);

  useEffect(() => {
    let map;
    Promise.all([
      d3.csv(CSV_URL, d3.autoType),
      d3.json(GEO_URL)
    ]).then(([csv, geo]) => {
      /* lookup { nbhd: white%_2010 } */
      const white2010 = {};
      csv.forEach(d => {
        if (+d.year === 2010)
          white2010[d.neighborhood.trim()] = +d.White_per;
      });

      /* attach property for styling */
      geo.features.forEach(f => {
        const nb = f.properties.name.trim();
        f.properties.white10 = white2010[nb] ?? null;
      });

      /* ---------- Mapbox init ---------- */
      map = new mapboxgl.Map({
        container: mapNode.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-71.06, 42.32],
        zoom: 11
      });

      map.on("load", () => {
        /* data source */
        map.addSource("neigh", { type: "geojson", data: geo });

        /* fill layer */
        map.addLayer({
          id: "neigh-fill",
          type: "fill",
          source: "neigh",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "white10"], null], "#cccccc",
              ["interpolate",
                ["linear"],
                ["get", "white10"],
                0, colour(0),
                100, colour(100)
              ]
            ],
            "fill-opacity": 0.85,
            "fill-outline-color": "#444"
          }
        });

        /* outline on hover */
        map.addLayer({
          id: "neigh-line",
          type: "line",
          source: "neigh",
          paint: { "line-color": "#111", "line-width": 1 }
        });

        /* popup */
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });

        map.on("mousemove", "neigh-fill", e => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features[0];
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<strong>${f.properties.name}</strong><br/>
               White (2010): ${f.properties.white10 == null ? "n/a" : f.properties.white10 + "%"}`
            )
            .addTo(map);
        });
        map.on("mouseleave", "neigh-fill", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      });
    });

    return () => map && map.remove();
  }, []);

  return (
    <div style={{ height: "600px", width: "100%" }} ref={mapNode} />
  );
}

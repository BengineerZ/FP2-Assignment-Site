import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import * as d3 from "d3";
import L from 'leaflet'; // Import Leaflet library itself for LatLngBounds type checking if needed, though .isValid() should work
import "leaflet/dist/leaflet.css";
import "./CorporateOwnershipScales.css";
import FancyScale from "./FancyScale";
import ProfileCard from "./ProfileCard";

/* -----------------------------------------------------------
   Helpers
------------------------------------------------------------*/
const REGION_PROPS = ["massgis_name", "census_name", "NAME", 'name'];
const getRegionName = (props) => {
  for (const key of REGION_PROPS) {
    if (props[key]) return props[key].toUpperCase();
  }
  return "";
};

// Full‑metro extent and its visual centre (for initial view)
const FULL_BOUNDS = [
  [42.30, -71.15], // Southwest corner
  [42.40, -71.00], // Northeast corner
];
const FULL_CENTER = [42.35, -71.075]; // Approximate center of Boston
const FULL_ZOOM = 11; // Adjusted zoom level for a closer view

/** SVG weighing scale */
/** SVG weighing scale - Prettier & Animated */
/** SVG weighing-scale that keeps each pan vertical while the beam tilts */
const Scale = ({ ratio }) => {
    // Limit the beam angle so it never goes past ±25°
    const angle = Math.max(-25, Math.min(25, (ratio - 1) * 25));
  
    // Geometry helpers
    const pivot   = { x: 0,  y: -60 };   // top-centre of the column
    const offsetX = 80;                  // half-length of the beam
    const chainLen = 29;                 // vertical length of each chain
  
    return (
      <svg viewBox="0 0 200 200" className="scale-svg">
        {/* Move SVG origin to the visual centre of the scale */}
        <g transform="translate(100 100)">
          {/* ----- static base & column ----- */}
          <rect x="-70" y="40" width="140" height="15" rx="3" className="scale-base" />
          <rect x="-6"  y={pivot.y} width="12" height="100" rx="3" className="scale-column" />
          <circle cx={pivot.x} cy={pivot.y} r="4" className="scale-pivot-deco" />
  
          {/* ----- moving parts: beam + anchor points tilt together ----- */}
          <g transform={`rotate(${angle} ${pivot.x} ${pivot.y})`} className="scale-moving">
            {/* beam */}
            <rect
              x={-offsetX}
              y={pivot.y - 8}
              width={offsetX * 2}
              height="10"
              rx="2"
              className="scale-beam"
            />
  
            {/* LEFT pan assembly ------------------------------------------------ */}
            <g
              transform={`translate(${-offsetX}, ${pivot.y - 4}) rotate(${-angle})`}
              className="scale-pan-assembly"
            >
              {/* chain (always vertical after the counter-rotation) */}
              <line x1="0" y1="0" x2="0" y2={chainLen} className="scale-chain" />
              {/* bowl-shaped pan */}
              <path d={`M -10 ${chainLen} Q 0 ${chainLen + 20} 10 ${chainLen} Z`} className="scale-pan" />
            </g>
  
            {/* RIGHT pan assembly ----------------------------------------------- */}
            <g
              transform={`translate(${offsetX}, ${pivot.y - 4}) rotate(${-angle})`}
              className="scale-pan-assembly"
            >
              <line x1="0" y1="0" x2="0" y2={chainLen} className="scale-chain" />
              <path d={`M -10 ${chainLen} Q 0 ${chainLen + 20} 10 ${chainLen} Z`} className="scale-pan" />
            </g>
          </g>
        </g>
      </svg>
    );
  };
  

/**
 * CorporateOwnershipScales React component (v6.2 - Zoom Fix Attempt)
 */
const CorporateOwnershipScales = ({ csvUrl, geoJsonUrl, width = 900, height = 600 }) => {
  const [data, setData] = useState([]);
  const [regionsGeo, setRegionsGeo] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null); // UPPER‑CASE
  const [year, setYear] = useState(null);
  // Use useRef for the map instance
  const mapRef = useRef(null); // Initialize with null

  /* --- Load CSV & GeoJSON --- */
  useEffect(() => {
    // Updated d3.csv parsing to match new headers: Neighborhood, Year, own, corp
    d3.csv(csvUrl, (d) => {
      const corpSales = +d.corp || 0; // Ensure numeric, default to 0 if missing/invalid
      const ownerSales = +d.own || 0; // Ensure numeric, default to 0 if missing/invalid
      return {
        region: (d.Neighborhood || "").toUpperCase(), // Use Neighborhood for region
        year: +d.Year, // Use Year
        corporate_sales: corpSales, // Use corp
        owner_sales: ownerSales, // Use own
        total_sales: corpSales + ownerSales, // Calculate total_sales
      };
    }).then((rows) => {
      setData(rows);
      // Ensure years are extracted correctly after parsing
      const sortedYears = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
      // Set initial year only if sortedYears is not empty
      if (sortedYears.length > 0) {
        setYear(sortedYears[0]);
      } else {
        setYear(null); // Handle case where no valid years are found
      }
    }).catch(error => {
        console.error("Error loading or parsing CSV:", error);
        // Handle error state appropriately, e.g., show an error message
    });

    fetch(geoJsonUrl)
      .then((r) => r.json())
      .then(setRegionsGeo)
      .catch(error => console.error("Error loading GeoJSON:", error));
  }, [csvUrl, geoJsonUrl]);

  /* --- Filter GeoJSON to only regions present in data --- */
  const filteredGeo = useMemo(() => {
    if (!regionsGeo || !data.length) return null;
    const dataRegions = new Set(data.map((d) => d.region));
    if (regionsGeo.type === "FeatureCollection") {
      const feats = regionsGeo.features.filter((f) => dataRegions.has(getRegionName(f.properties)));
      return { ...regionsGeo, features: feats };
    }
    // Handle case where regionsGeo might be a single Feature
    if (regionsGeo.type === "Feature") {
        return dataRegions.has(getRegionName(regionsGeo.properties)) ? regionsGeo : null;
    }
    return null; // Return null if not FeatureCollection or Feature
  }, [regionsGeo, data]);

  /* --- Baseline corporate‑ownership rate (first year) --- */
  const baselineRate = useMemo(() => {
    if (!data.length) return new Map();
    // Find the minimum year from the parsed data
    const initYear = d3.min(data, (d) => d.year);
    // Handle case where initYear might be undefined (if data is empty or has no valid years)
    if (initYear === undefined) return new Map();

    const rates = new Map();
    const byRegion = d3.group(
      data.filter((d) => d.year === initYear),
      (d) => d.region
    );
    byRegion.forEach((arr, region) => {
      // Use the updated property names
      const corp = d3.sum(arr, (d) => d.corporate_sales);
      const total = d3.sum(arr, (d) => d.total_sales);
      rates.set(region, total ? corp / total : 0); // Avoid division by zero
    });

    // Calculate baseline for "ALL" regions
    const initYearData = data.filter((d) => d.year === initYear); // Filter once
    const corpAll = d3.sum(initYearData, (d) => d.corporate_sales);
    const totalAll = d3.sum(initYearData, (d) => d.total_sales);
    rates.set("ALL", totalAll ? corpAll / totalAll : 0); // Avoid division by zero
    return rates;
  }, [data]);

  const currentRate = useMemo(() => {
    // Ensure year is not null/undefined before filtering
    if (!year || !data.length) return 0;
    const rows = data.filter(
      (d) => d.year === year && (!selectedRegion || d.region === selectedRegion)
    );
    // Use the updated property names
    const corp = d3.sum(rows, (d) => d.corporate_sales);
    const total = d3.sum(rows, (d) => d.total_sales);
    return total ? corp / total : 0; // Avoid division by zero
  }, [data, year, selectedRegion]);

  const ratio = useMemo(() => {
    if (!baselineRate.size || !year) return 1; // Also check if year is set
    const key = selectedRegion || "ALL";
    // Ensure baseline exists for the key, provide a very small number to avoid division by zero if rate is 0
    const base = baselineRate.get(key) || 0.00001;
    // Ensure current rate isn't NaN or undefined before division
    // currentRate calculation already handles division by zero, returning 0
    const current = currentRate ;
    // Avoid division by zero for the base rate
    return base === 0 ? (current === 0 ? 1 : Infinity) : current / base ; // Handle base=0 case explicitly
  }, [baselineRate, currentRate, selectedRegion, year]);

  const years = useMemo(
    () => Array.from(new Set(data.map((d) => d.year))).sort((a, b) => a - b),
    [data]
  );

  /* --- Map helpers --- */
  const zoomToFull = () => {
    // Check if mapRef is populated
    if (mapRef.current) {
      mapRef.current.flyToBounds(FULL_BOUNDS, { padding: [20, 20] });
    } else {
      console.warn("zoomToFull called before map instance is ready.");
    }
  };

  const handleRegionClick = (e) => {
    const layer = e.target; // Use e.target which is the layer clicked
    const regionName = getRegionName(layer.feature.properties);
    const newSelected = selectedRegion === regionName ? null : regionName;

    // Check if map instance exists
    if (!mapRef.current) {
        console.error("Map instance not available in handleRegionClick.");
        return;
    }

    // Update selected state first
    setSelectedRegion(newSelected);

    // Perform zoom AFTER state update logic
    if (newSelected) {
      const bounds = layer.getBounds();
      // Check if bounds are valid before zooming
      if (bounds && bounds.isValid()) {
        mapRef.current.flyToBounds(bounds, { maxZoom: 12, padding: [20, 20] });
      } else {
         console.error("Invalid bounds calculated for the selected region:", regionName, bounds);
         // Optionally zoom to full extent as a fallback if bounds are bad
         // zoomToFull();
      }
    } else {
      // Zoom out if region was deselected
      zoomToFull();
    }
  };

  /* Reset zoom on initial mount */
  useEffect(() => {
    // Check ref before calling zoom
    if (mapRef.current) {
        // Small delay might sometimes help ensure map tiles/layers are fully ready, but often not needed
        // setTimeout(() => zoomToFull(), 100);
        zoomToFull();
    }
    // This effect should run once on mount, mapRef.current might not be set yet
    // It will be set by the MapContainer's ref prop after initial render
    // Consider moving initial zoom to *after* GeoJSON load, or use a state variable
  }, []); // Empty dependency array - runs once on mount

  // Alternative: Trigger initial zoom when map is ready AND data is loaded
  useEffect(() => {
    if (mapRef.current && filteredGeo) {
      zoomToFull();
    }
  }, [filteredGeo]); // Run when filteredGeo changes (implies data and geojson are loaded)


  const regionStyle = (feature) => {
    const name = getRegionName(feature.properties);
    return {
      weight: 1,
      color: "#555",
      fillOpacity: selectedRegion ? (name === selectedRegion ? 0.7 : 0.2) : 0.5,
      fillColor: "#3182bd", // Example color
    };
  };

  const onEachRegion = (feature, layer) => {
    // Highlight on hover
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 3, color: '#666' }), // Make highlight more visible
      mouseout: (e) => layer.setStyle(regionStyle(feature)), // Reset to original style
      click: handleRegionClick, // Use the robust handler
    });

    // Tooltip
    const props = feature.properties;
    const tip = props.census_name || props.massgis_name || props.NAME || "Region"; // Fallback tooltip
    layer.bindTooltip(tip);
  };

  // Reset style on mouseout needs the GeoJSON layer access or default style
  // A common pattern is to use resetStyle method from GeoJSON layer ref, but here we reset manually
   const resetHighlight = (e) => {
       // Need a way to get the specific GeoJSON layer to reset its style or find the feature
       // Simpler: Pass the feature to the handler or reset based on current style state
       // For now, setting style directly might conflict if multiple layers are moused over quickly
       // A better approach for reset might involve storing default style or using GeoJSON layer's resetStyle if accessible
        const layer = e.target;
        // We need the original style defined by regionStyle(feature)
        // The GeoJSON component applies style, getting it back might be tricky
        // Simplest robust way here is to re-apply based on selection state:
         layer.setStyle(regionStyle(layer.feature));
   };

   // Revised onEachRegion for better mouseout
   const onEachRegionRevised = (feature, layer) => {
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 3, color: '#444' }), // Highlight
      mouseout: (e) => {
           // Check if the layer is the currently selected one before resetting fully
           const currentName = getRegionName(feature.properties);
           if (selectedRegion !== currentName) {
               e.target.setStyle(regionStyle(feature)); // Reset fully only if not selected
           } else {
               // If it IS selected, reset weight/color but keep opacity
                e.target.setStyle({
                    weight: 1, // Reset weight
                    color: "#555", // Reset color
                    fillOpacity: 0.7, // Keep selected opacity
                    fillColor: "#3182bd" // Keep fill color
                });
           }
      },
      click: handleRegionClick,
    });
    const props = feature.properties;
    const tip = props.census_name || props.massgis_name || props.NAME || "Region";
    layer.bindTooltip(tip);
  };


  if (!filteredGeo || !year) return <div className="corp-loading">Loading…</div>;

  return (
    <div className="corp-container" style={{ width }}>
      {/* Map & Scale Row */}
      <div className="timeline">
        <input
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="timeline__slider"
            disabled={!years.length}
        />
        <div className="timeline__year">{year || '…'}</div>
        </div>
      <div className="top-row" style={{ height: height - 120 }}>
        <div className="map-wrapper">
          <MapContainer
            center={FULL_CENTER}
            zoom={FULL_ZOOM}
            style={{ height: "100%", width: "100%" }}
            className="map"
            scrollWheelZoom={false}
            ref={mapRef} // Use the ref prop here
          >
            <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
            {/* Key change: Ensure key prop forces re-render if geo data fundamentally changes, style uses function */}
            {filteredGeo && (
                <GeoJSON
                    key={JSON.stringify(filteredGeo)} // Add key if filteredGeo can change structure
                    data={filteredGeo}
                    style={regionStyle} // Pass the style function
                    onEachFeature={onEachRegionRevised} // Use the revised handler
                />
             )}
          </MapContainer>
        </div>
        <div className='scale-wrapper' style={{ width: 400 }}>
            <ProfileCard
            region={selectedRegion}
            ratio={ratio}
            currentRate={currentRate}
            onClose={() => {
                setSelectedRegion(null);
                zoomToFull();
            }}
            />
        </div>
      </div>

      {/* Timeline */}
      

      
    </div>
  );
};

export default CorporateOwnershipScales;
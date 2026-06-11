import { useEffect, useRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function createIcon(color, letter) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;
      background:${color};
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;color:#fff;font-family:sans-serif;
      line-height:1;
    ">${letter}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

const ICONS = {
  healthcare: createIcon('#dc2626', 'H'),
  retail: createIcon('#2563eb', 'R'),
  location: createIcon('#16a34a', '★'),
};

// Flies to the search location whenever it changes
function FlyController({ target }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!target) return;
    if (prev.current?.lat === target.lat && prev.current?.lon === target.lon) return;
    prev.current = target;
    map.flyTo([target.lat, target.lon], 13, { animate: true, duration: 1.2 });
  }, [target, map]);
  return null;
}

// Captures the leaflet map instance into the provided ref
function MapInstanceCapture({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// React 19 passes ref as a regular prop
export default function MapView({ searchLocation, results, radius, serviceType, ref }) {
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  useImperativeHandle(ref, () => ({
    focusMarker(result) {
      const marker = markerRefs.current[result.id];
      const map = mapRef.current;
      if (map) {
        map.flyTo([result.lat, result.lon], Math.max(map.getZoom(), 15), {
          animate: true,
          duration: 0.8,
        });
      }
      if (marker) {
        setTimeout(() => marker.openPopup(), 900);
      }
    },
  }));

  return (
    <MapContainer
      center={[56, -96]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <MapInstanceCapture mapRef={mapRef} />
      <FlyController target={searchLocation} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {searchLocation && (
        <>
          <Marker
            position={[searchLocation.lat, searchLocation.lon]}
            icon={ICONS.location}
          >
            <Popup>
              <strong>Search Location</strong>
              {searchLocation.display_name && (
                <><br /><span style={{ fontSize: '0.8em', color: '#555' }}>{searchLocation.display_name}</span></>
              )}
            </Popup>
          </Marker>
          <Circle
            center={[searchLocation.lat, searchLocation.lon]}
            radius={radius}
            pathOptions={{
              color: '#16a34a',
              fillColor: '#16a34a',
              fillOpacity: 0.06,
              weight: 2,
              dashArray: '6 4',
            }}
          />
        </>
      )}

      {results.map((result) => (
        <Marker
          key={result.id}
          position={[result.lat, result.lon]}
          icon={ICONS[serviceType] || ICONS.healthcare}
          ref={(el) => {
            if (el) markerRefs.current[result.id] = el;
            else delete markerRefs.current[result.id];
          }}
        >
          <Popup>
            <div style={{ minWidth: '160px' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{result.name}</strong>
              <span style={{ color: '#555', fontSize: '0.85em' }}>{result.amenity}</span>
              <br />
              <span style={{ fontSize: '0.85em' }}>
                📍 {result.distance?.toFixed(2)} km away
              </span>
              {result.address && (
                <><br /><span style={{ fontSize: '0.8em', color: '#666' }}>{result.address}</span></>
              )}
              {result.phone && (
                <><br /><span style={{ fontSize: '0.8em' }}>📞 {result.phone}</span></>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

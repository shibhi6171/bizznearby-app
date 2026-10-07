import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import '../../utils/leafletIcons.js';
import { fmtDistance } from '../../utils/format.js';

function Fit({ center, radiusKm }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000), { animate: false });
  }, [map, center.lat, center.lng, radiusKm]);
  return null;
}

// center: where the search is centred. showCenter: draw the "you are here" dot and radius ring.
export default function MapView({ center, radiusKm = 2, items = [], height = '420px', showCenter = true, link = true }) {
  return (
    <div style={{ height }} className="rounded-3xl border border-ink-line bg-white p-2">
      <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit center={center} radiusKm={radiusKm} />
        {showCenter && (
          <>
            <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#3fc45a', weight: 1.5, dashArray: '4 5', fillOpacity: 0.04 }} />
            <CircleMarker center={[center.lat, center.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#0b1220', fillOpacity: 1 }}>
              <Popup>You are here</Popup>
            </CircleMarker>
          </>
        )}
        {items.map((b) => (
          <Marker key={b.id} position={[b.latitude, b.longitude]}>
            <Popup>
              <strong>{b.name}</strong>
              {b.distance_meters != null && <div>{fmtDistance(b.distance_meters)} away</div>}
              {b.max_discount > 0 && <div>{b.max_discount}% off</div>}
              {link && <Link to={`/business/${b.id}`}>View details</Link>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

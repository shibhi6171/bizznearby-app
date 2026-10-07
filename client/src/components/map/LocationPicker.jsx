import { useEffect, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import '../../utils/leafletIcons.js';

const INDIA = [20.5937, 78.9629];

function ClickCatcher({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => { if (target) map.setView([target.lat, target.lng], 16); }, [map, target]);
  return null;
}

// Click the map or drag the pin. value: { lat, lng } | null
export default function LocationPicker({ value, onChange, height = '360px' }) {
  const [focus, setFocus] = useState(value);
  const [msg, setMsg] = useState('');

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg('Your browser cannot share its location.');
    setMsg('Finding you...');
    navigator.geolocation.getCurrentPosition(
      (p) => { const v = { lat: p.coords.latitude, lng: p.coords.longitude }; onChange(v); setFocus(v); setMsg(''); },
      () => setMsg('Location permission was denied. Click the map instead.'),
      { timeout: 10000 }
    );
  }

  return (
    <div>
      <div style={{ height }} className="rounded-3xl border border-ink-line bg-white p-2">
        <MapContainer center={value ? [value.lat, value.lng] : INDIA} zoom={value ? 16 : 5}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickCatcher onChange={onChange} />
          <FlyTo target={focus} />
          {value && (
            <Marker position={[value.lat, value.lng]} draggable
                    eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange({ lat: p.lat, lng: p.lng }); } }} />
          )}
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
        <button type="button" className="btn !px-4 !py-1.5 text-sm" onClick={useMyLocation}><LocateFixed size={15} /> Use my current location</button>
        <span>{value ? `Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'Click the map to place the pin.'}</span>
        {msg && <span className="err-text">{msg}</span>}
      </div>
    </div>
  );
}

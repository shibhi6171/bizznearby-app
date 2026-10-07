import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
// Maps need real browser layout; replace them with simple stand-ins for these tests.
vi.mock('../src/components/map/MapView.jsx', () => ({ default: ({ items = [] }) => <div data-testid="map">map with {items.length} pins</div> }));
vi.mock('../src/components/map/LocationPicker.jsx', () => ({ default: ({ value, onChange }) => <button onClick={() => onChange({ lat: 11, lng: 77 })}>pick-location{value ? ' (set)' : ''}</button> }));
URL.createObjectURL = () => 'blob:test-' + Math.random();
URL.revokeObjectURL = () => {};

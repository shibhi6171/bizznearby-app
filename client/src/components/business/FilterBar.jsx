import { CATEGORIES, RADII_KM } from '../../utils/format.js';

export function CategoryChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label="Category">
      {CATEGORIES.map((c) => (
        <button key={c.slug} type="button" aria-pressed={value === c.slug}
                className={`chip ${value === c.slug ? 'chip-on' : ''}`} onClick={() => onChange(c.slug)}>
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function RadiusSlider({ value, onChange }) {
  return (
    <label className="flex min-w-[230px] flex-1 items-center gap-3 font-semibold">
      Radius
      <input type="range" min="0" max={RADII_KM.length - 1} step="1" value={value}
             onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-brand-green" aria-valuetext={`${RADII_KM[value]} kilometres`} />
      <output className="w-14 font-extrabold">{RADII_KM[value]} km</output>
    </label>
  );
}

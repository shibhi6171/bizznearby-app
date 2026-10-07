import { useState } from 'react';
import { Store } from 'lucide-react';
import { thumb } from '../../utils/format.js';

export default function ImageGallery({ images = [], name }) {
  const [i, setI] = useState(0);
  if (!images.length) {
    return (
      <div className="grid h-72 place-items-center rounded-3xl bg-gradient-to-br from-green-100 to-blue-100 text-ink-soft">
        <div className="text-center"><Store size={44} className="mx-auto opacity-50" /><p className="mt-2 text-sm">The seller hasn&apos;t added photos yet.</p></div>
      </div>
    );
  }
  return (
    <div>
      <img src={thumb(images[i].url, 1200)} alt={`${name} photo ${i + 1}`} className="h-72 w-full rounded-3xl object-cover sm:h-96" />
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button key={img.id} type="button" onClick={() => setI(idx)} aria-label={`Show photo ${idx + 1}`}
                    className={`h-16 w-16 flex-none overflow-hidden rounded-xl border-2 ${idx === i ? 'border-brand-green' : 'border-transparent'}`}>
              <img src={thumb(img.url, 160)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

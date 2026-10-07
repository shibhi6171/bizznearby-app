export default function Logo({ className = 'text-2xl' }) {
  return (
    <span className={`font-extrabold tracking-tighter ${className}`}>
      <span className="text-brand-blue">BIZZ</span>
      <span className="text-brand-green">NEARBY.</span>
    </span>
  );
}

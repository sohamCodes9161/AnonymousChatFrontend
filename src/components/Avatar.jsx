const SIZES = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };

export function Avatar({ name = '', src, size = 'md', className = '' }) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <div
      className={`${SIZES[size] || SIZES.md} rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-semibold bg-gradient-to-br from-accent-primary to-accent-secondary text-white ${className}`}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initial}
    </div>
  );
}

export function SectionHeader({ title, count, highlight = false }) {
  return (
    <div className="flex items-center gap-2 px-2 mb-2">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {count > 0 && (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            highlight ? 'bg-accent-primary text-white' : 'bg-surface-secondary text-text-secondary'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
}

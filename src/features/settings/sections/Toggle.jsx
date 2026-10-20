export function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-surface-secondary"
      >
        <div className="flex items-center gap-2 text-sm text-text-primary text-left">
          {Icon && <Icon size={16} className="text-text-secondary flex-shrink-0" />}
          {label}
        </div>
        <div
          className={`w-9 h-5 rounded-pill flex items-center px-0.5 flex-shrink-0 transition-colors duration-fast ${
            checked ? 'bg-accent-primary justify-end' : 'bg-surface-secondary justify-start'
          }`}
        >
          <div className="w-4 h-4 rounded-pill bg-white shadow-elevation-1" />
        </div>
      </button>
      {description && <p className="text-xs text-text-muted px-2 mt-1">{description}</p>}
    </div>
  );
}

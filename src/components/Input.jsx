export function Input({ label, error, className = '', id, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          px-3 py-2 rounded-md text-sm
          bg-surface-elevated text-text-primary
          border ${error ? 'border-status-error' : 'border-border'}
          placeholder:text-text-muted
          transition-colors duration-fast
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-status-error">{error}</span>}
    </div>
  );
}

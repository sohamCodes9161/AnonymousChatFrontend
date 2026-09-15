const VARIANTS = {
  primary: 'bg-accent-primary text-white hover:opacity-90',
  secondary: 'bg-surface-secondary text-text-primary hover:bg-surface-elevated border border-border',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-secondary',
  danger: 'bg-status-error text-white hover:opacity-90',
};

export function Button({ variant = 'primary', className = '', disabled, children, ...props }) {
  return (
    <button
      className={`
        px-4 py-2 rounded-md font-medium text-sm
        transition-colors duration-fast
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary
        ${VARIANTS[variant]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

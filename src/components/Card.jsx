export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-surface-elevated border border-border rounded-lg shadow-elevation-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

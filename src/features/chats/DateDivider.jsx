function formatDateDivider(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a, b) => a.toDateString() === b.toDateString();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function DateDivider({ dateStr }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="text-xs text-text-muted bg-surface-secondary px-3 py-1 rounded-pill">
        {formatDateDivider(dateStr)}
      </span>
    </div>
  );
}

export function isSameCalendarDay(dateStrA, dateStrB) {
  return new Date(dateStrA).toDateString() === new Date(dateStrB).toDateString();
}

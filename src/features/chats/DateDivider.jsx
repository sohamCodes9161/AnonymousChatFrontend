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
    <div className="flex justify-center">
      <span className="glass-pill mx-auto my-4 text-xs font-medium text-text-secondary px-3.5 py-1 rounded-full">
        {formatDateDivider(dateStr)}
      </span>
    </div>
  );
}

export function isSameCalendarDay(dateStrA, dateStrB) {
  return new Date(dateStrA).toDateString() === new Date(dateStrB).toDateString();
}

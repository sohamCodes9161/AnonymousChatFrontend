// Per-chat look: a wallpaper and a sent-bubble color, chosen by the viewer
// and stored only in this browser (like WhatsApp/iMessage chat themes, the
// choice is personal — nobody else sees it).

const dots = (ink) => ({
  backgroundImage: `radial-gradient(circle at 1px 1px, ${ink} 1.2px, transparent 1.6px)`,
  backgroundSize: '22px 22px',
});

export const WALLPAPERS = [
  { id: 'dots', label: 'Dotted', style: () => dots('var(--canvas-ink)') },
  {
    id: 'grid',
    label: 'Grid',
    style: () => ({
      backgroundImage:
        'linear-gradient(var(--canvas-ink) 1px, transparent 1px), linear-gradient(90deg, var(--canvas-ink) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }),
  },
  {
    id: 'aurora',
    label: 'Aurora',
    style: () => ({
      backgroundImage:
        'radial-gradient(60% 50% at 15% 10%, rgba(120,110,255,0.28), transparent 70%), radial-gradient(55% 45% at 90% 25%, rgba(45,212,191,0.2), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgba(244,114,182,0.2), transparent 70%)',
    }),
  },
  {
    id: 'dusk',
    label: 'Dusk',
    style: () => ({
      backgroundImage:
        'linear-gradient(180deg, rgba(79,70,229,0.22) 0%, rgba(190,24,93,0.14) 55%, rgba(251,146,60,0.14) 100%)',
    }),
  },
  { id: 'plain', label: 'Plain', style: () => ({}) },
];

export const BUBBLE_COLORS = [
  { id: 'indigo', label: 'Indigo', a: '#5b4fe8', b: '#7a6ff2' },
  { id: 'ocean', label: 'Ocean', a: '#1d62c9', b: '#3b8ef0' },
  { id: 'teal', label: 'Teal', a: '#0b7f84', b: '#18a5a0' },
  { id: 'rose', label: 'Rose', a: '#c2255c', b: '#e5497f' },
  { id: 'amber', label: 'Amber', a: '#b45309', b: '#d97706' },
  { id: 'graphite', label: 'Graphite', a: '#363647', b: '#54546b' },
];

export const DEFAULT_THEME = { wallpaper: 'dots', bubble: 'indigo' };

export function resolveTheme(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const wallpaper = WALLPAPERS.find((w) => w.id === t.wallpaper) || WALLPAPERS[0];
  const bubble = BUBBLE_COLORS.find((b) => b.id === t.bubble) || BUBBLE_COLORS[0];
  return {
    ...t,
    wallpaperStyle: wallpaper.style(),
    // Indigo keeps following the app accent (so light/dark tuning applies);
    // other presets set explicit colors.
    bubbleVars:
      bubble.id === 'indigo' ? {} : { '--bubble-sent-a': bubble.a, '--bubble-sent-b': bubble.b },
  };
}

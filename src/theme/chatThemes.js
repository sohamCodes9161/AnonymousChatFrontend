// Per-chat look: a wallpaper and a sent-bubble color, chosen by the viewer
// and stored only in this browser (like WhatsApp/iMessage chat themes, the
// choice is personal — nobody else sees it).

// Wallpapers are stacked layers (top → bottom): vignette, pattern, soft
// color glows. Every color comes from CSS vars so light/dark both work.
// Each layer carries its own size/repeat so the lists always line up.
const FULL = ['cover', 'no-repeat'];
const L = (image, size = FULL[0], repeat = FULL[1]) => ({ image, size, repeat });

const VIGNETTE = L('radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--canvas-vignette) 100%)');
const GLOWS = [
  L('radial-gradient(55% 40% at 12% 8%, var(--canvas-glow-1), transparent 70%)'),
  L('radial-gradient(50% 40% at 92% 30%, var(--canvas-glow-2), transparent 70%)'),
  L('radial-gradient(60% 45% at 40% 105%, var(--canvas-glow-3), transparent 70%)'),
];
const DOODLE = L('var(--doodle)', '160px 160px', 'repeat');
const DOTS = L('radial-gradient(circle at 1px 1px, var(--canvas-ink) 1.2px, transparent 1.7px)', '22px 22px', 'repeat');
const GRID = [
  L('linear-gradient(var(--canvas-ink) 1px, transparent 1px)', '28px 28px', 'repeat'),
  L('linear-gradient(90deg, var(--canvas-ink) 1px, transparent 1px)', '28px 28px', 'repeat'),
];

const stack = (...layers) => {
  const flat = layers.flat();
  return {
    backgroundImage: flat.map((l) => l.image).join(', '),
    backgroundSize: flat.map((l) => l.size).join(', '),
    backgroundRepeat: flat.map((l) => l.repeat).join(', '),
  };
};

export const WALLPAPERS = [
  { id: 'doodle', label: 'Doodle', style: () => stack(VIGNETTE, DOODLE, GLOWS) },
  { id: 'dots', label: 'Dotted', style: () => stack(VIGNETTE, DOTS, GLOWS) },
  { id: 'grid', label: 'Grid', style: () => stack(VIGNETTE, GRID, GLOWS) },
  {
    id: 'aurora',
    label: 'Aurora',
    style: () =>
      stack(
        VIGNETTE,
        DOODLE,
        L('radial-gradient(60% 50% at 15% 10%, rgba(59,130,246,0.38), transparent 70%)'),
        L('radial-gradient(55% 45% at 90% 25%, rgba(20,184,166,0.30), transparent 70%)'),
        L('radial-gradient(60% 50% at 50% 100%, rgba(236,72,153,0.22), transparent 70%)')
      ),
  },
  {
    id: 'dusk',
    label: 'Dusk',
    style: () =>
      stack(
        VIGNETTE,
        DOODLE,
        L('linear-gradient(180deg, rgba(30,64,175,0.34) 0%, rgba(147,51,234,0.14) 50%, rgba(249,115,22,0.22) 100%)')
      ),
  },
  { id: 'plain', label: 'Plain', style: () => ({}) },
];

export const BUBBLE_COLORS = [
  // Follows the app accent (blue), tuned separately for light and dark.
  { id: 'default', label: 'Default', a: '#1d5fe0', b: '#3b82f6' },
  { id: 'indigo', label: 'Violet', a: '#6a4fe8', b: '#8a6ff2' },
  { id: 'blue', label: 'Blue', a: '#1d5fe0', b: '#3b82f6' },
  { id: 'teal', label: 'Teal', a: '#0b7f84', b: '#18a5a0' },
  { id: 'rose', label: 'Rose', a: '#c2255c', b: '#e5497f' },
  { id: 'amber', label: 'Amber', a: '#b45309', b: '#d97706' },
  { id: 'graphite', label: 'Graphite', a: '#2f353e', b: '#4b5360' },
];

export const DEFAULT_THEME = { wallpaper: 'doodle', bubble: 'default' };

export function resolveTheme(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const wallpaper = WALLPAPERS.find((w) => w.id === t.wallpaper) || WALLPAPERS[0];
  const bubble = BUBBLE_COLORS.find((b) => b.id === t.bubble) || BUBBLE_COLORS[0];
  return {
    ...t,
    wallpaperStyle: wallpaper.style(),
    // Default keeps following the app accent (so light/dark tuning applies);
    // other presets set explicit colors.
    bubbleVars:
      bubble.id === 'default' ? {} : { '--bubble-sent-a': bubble.a, '--bubble-sent-b': bubble.b },
  };
}

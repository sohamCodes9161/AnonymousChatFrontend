/**
 * GIPHY client — called straight from the browser (per GIPHY's API
 * terms), so searches never touch our server and the rate limit is
 * per-user-IP rather than shared by the whole app. Our backend only ever
 * sees the final chosen links, and only accepts giphy.com URLs.
 *
 * Needs VITE_GIPHY_API_KEY. Without it the GIF button is simply hidden.
 */
const API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const BASE = 'https://api.giphy.com/v1/gifs';
export const PAGE_SIZE = 24;
// Chat is a social product with an anonymous audience — keep results
// family-friendly. Change to 'pg-13' / 'r' if you want looser results.
const RATING = 'pg';

export const isGiphyConfigured = Boolean(API_KEY);

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Reduces GIPHY's big per-GIF payload to what the UI needs, and drops
// anything missing a usable rendition instead of rendering a broken tile.
function normalize(item) {
  const images = item?.images;
  if (!images) return null;
  const grid = images.fixed_height_small || images.downsized;
  const preview = images.fixed_height;
  const original = images.original;
  if (!grid?.url || !preview?.url || !original?.url) return null;

  const gridWidth = toInt(grid.width);
  const gridHeight = toInt(grid.height);
  const width = toInt(preview.width);
  const height = toInt(preview.height);
  if (!gridWidth || !gridHeight || !width || !height) return null;

  return {
    id: item.id,
    title: (item.title || '').trim(),
    gridUrl: grid.url, // small + fast — used only in the picker grid
    gridWidth,
    gridHeight,
    gifUrl: original.url, // full size — opened on click in the chat
    previewUrl: preview.url, // 200px-tall — shown in the chat bubble
    width, // dimensions of previewUrl, for layout-shift-free bubbles
    height,
  };
}

export async function fetchGifs({ query, offset = 0, signal }) {
  const trimmed = (query || '').trim();
  const params = new URLSearchParams({
    api_key: API_KEY,
    limit: String(PAGE_SIZE),
    offset: String(offset),
    rating: RATING,
  });
  if (trimmed) params.set('q', trimmed);

  let res;
  try {
    res = await fetch(`${BASE}/${trimmed ? 'search' : 'trending'}?${params}`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Could not reach GIPHY. Check your connection.');
  }

  if (res.status === 429) throw new Error('GIPHY is busy right now — try again in a minute.');
  if (!res.ok) throw new Error('GIPHY search failed. Try again.');

  const json = await res.json();
  const seen = new Set();
  const items = (json.data || []).map(normalize).filter((g) => {
    if (!g || seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });

  const { offset: pageOffset = offset, count = 0, total_count: total = 0 } = json.pagination || {};
  const next = pageOffset + count;
  return { items, nextOffset: count > 0 && next < total ? next : null };
}

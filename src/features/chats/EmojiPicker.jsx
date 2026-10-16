import { useState } from 'react';
import { useDismiss } from '../../hooks/useDismiss.js';

// Compact built-in set (no extra dependency). Avoids multi-part emoji
// sequences so every glyph renders as one on all platforms.
const CATEGORIES = [
  {
    id: 'smileys',
    icon: '😀',
    label: 'Smileys',
    emojis: '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 😐 😑 😶 🙄 😏 😒 😬 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖'.split(' '),
  },
  {
    id: 'gestures',
    icon: '👍',
    label: 'Gestures',
    emojis: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 👏 🙌 👐 🤲 💪 🙈 🙉 🙊 👀 👅 👄 🧠'.split(' '),
  },
  {
    id: 'hearts',
    icon: '❤️',
    label: 'Hearts & symbols',
    emojis: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 💕 💞 💓 💗 💖 💘 💝 ✨ ⭐ 🌟 💫 🔥 💥 💯 ✅ ❌ ❗ ❓ 💤 🎉 🎊 🎈 🎁 🏆 👑 💎'.split(' '),
  },
  {
    id: 'nature',
    icon: '🐶',
    label: 'Animals & food',
    emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦄 🐝 🦋 🐢 🐙 🐬 🌸 🌹 🌻 🌈 ☀️ 🌙 ☁️ ⚡ ❄️ 🍎 🍌 🍉 🍓 🍒 🥑 🍕 🍔 🍟 🌮 🍩 🍪 🎂 ☕ 🍺 🍷'.split(' '),
  },
  {
    id: 'objects',
    icon: '⚽',
    label: 'Activities & objects',
    emojis: '⚽ 🏀 🏈 🎾 🎮 🎧 🎤 🎸 🎬 📷 💻 📱 💡 📚 🔑 💰 🚗 ✈️ 🚀 🏠 🌍 ⏰ 🔔 📌 ✏️ 🎯 🧩 🛒'.split(' '),
  },
];

/**
 * Popover above the composer. Picking inserts at the caret (handled by
 * the parent); it stays open so several can be added in a row.
 */
export function EmojiPicker({ onPick, onClose }) {
  const [active, setActive] = useState(CATEGORIES[0].id);
  useDismiss(onClose);
  const category = CATEGORIES.find((c) => c.id === active);

  return (
    <div
      data-tray
      role="dialog"
      aria-label="Choose an emoji"
      className="absolute z-30 bottom-full inset-x-0 md:inset-x-auto md:left-3 md:mb-2 md:w-[340px] h-[300px] flex flex-col bg-surface-elevated border border-border rounded-t-xl md:rounded-lg shadow-elevation-2 animate-slide-up-in"
    >
      <div className="flex items-center gap-0.5 px-2 pt-2 border-b border-border" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === active}
            aria-label={c.label}
            title={c.label}
            onClick={() => setActive(c.id)}
            className={`flex-1 h-9 text-lg rounded-t-md border-b-2 transition-colors duration-fast ${
              c.id === active ? 'border-accent-primary bg-accentSubtle' : 'border-transparent hover:bg-surfaceHover'
            }`}
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div className="px-3 pt-2 pb-1 text-xs font-semibold text-text-muted">{category.label}</div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        <div className="grid grid-cols-8 gap-0.5">
          {category.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              className="aspect-square rounded-md text-xl flex items-center justify-center hover:bg-surfaceHover active:scale-90 transition-transform duration-fast"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

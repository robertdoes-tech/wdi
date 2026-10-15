// Simple pink line icons and decorative SVGs (pink only).
const P = '#C76363';
const s = (w, h, body, vb) =>
  `<svg width="${w}" height="${h}" viewBox="${vb || `0 0 ${w} ${h}`}" fill="none" stroke="${P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const icons = {
  van: (z = 36) => s(z, z, '<path d="M3 9h18v15H3z"/><path d="M21 14h7l5 5v5h-12"/><circle cx="9" cy="27" r="3"/><circle cx="27" cy="27" r="3"/><path d="M12 27h12"/>', '0 0 36 36'),
  gift: (z = 36) => s(z, z, '<rect x="5" y="14" width="26" height="18"/><rect x="3" y="9" width="30" height="5"/><path d="M18 9v23"/><path d="M18 9c-3-6-10-6-9-1 1 3 9 1 9 1z"/><path d="M18 9c3-6 10-6 9-1-1 3-9 1-9 1z"/>', '0 0 36 36'),
  heart: (z = 36) => s(z, z, '<path d="M18 30C8 23 4 18 4 12.5 4 8.5 7 6 10.5 6c3 0 5.5 2 7.5 5 2-3 4.5-5 7.5-5C29 6 32 8.5 32 12.5 32 18 28 23 18 30z"/>', '0 0 36 36'),
  pen: (z = 36) => s(z, z, '<path d="M6 30l2-7L24 7l5 5-16 16z"/><path d="M21 10l5 5"/><path d="M6 30h24"/>', '0 0 36 36'),
  shop: (z = 36) => s(z, z, '<path d="M5 14h26v18H5z"/><path d="M3 14l4-8h22l4 8"/><path d="M3 14c0 3 3 4 5 4s5-1 5-4c0 3 3 4 5 4s5-1 5-4c0 3 3 4 5 4s5-1 5-4"/><path d="M15 32v-8h6v8"/>', '0 0 36 36'),
  candle: (z = 32) => s(z, z, '<rect x="10" y="14" width="12" height="15" rx="1"/><path d="M16 14v-3"/><path d="M16 4c2 2.5 2.5 4 0 6-2.5-2-2-3.5 0-6z"/>', '0 0 32 32'),
  mug: (z = 32) => s(z, z, '<path d="M5 10h17v13a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5z"/><path d="M22 13h3a3 3 0 0 1 0 7h-3"/><path d="M10 4c-1 2 1 3 0 5M15 4c-1 2 1 3 0 5"/>', '0 0 32 32'),
  flower: (z = 32) => s(z, z, '<circle cx="16" cy="11" r="3"/><path d="M16 8c-2-5 4-5 2 0M19 11c5-2 5 4 0 2M16 14c2 5-4 5-2 0M13 11c-5 2-5-4 0-2"/><path d="M16 14v15"/><path d="M16 23c-4 0-6-3-6-5 3 0 6 2 6 5z"/>', '0 0 32 32'),
  pin: (z = 36) => s(z, z, '<path d="M18 33s-10-10-10-18a10 10 0 0 1 20 0c0 8-10 18-10 18z"/><circle cx="18" cy="15" r="3.5"/>', '0 0 36 36'),
  quote: (z = 64) => `<svg width="${z}" height="${z * 0.75}" viewBox="0 0 64 48"><path fill="${P}" d="M0 48V28C0 12 8 3 24 0l2 6C17 9 13 15 13 22h11v26zm38 0V28C38 12 46 3 62 0l2 6c-9 3-13 9-13 16h11v26z"/></svg>`,
  star: (z = 16, fill = '#F4B400') => `<svg width="${z}" height="${z}" viewBox="0 0 24 24"><path fill="${fill}" d="M12 2l3 7 7.5.6-5.7 5 1.8 7.4L12 18l-6.6 4 1.8-7.4L1.5 9.6 9 9z"/></svg>`,
  starOutline: (z = 44) => s(z, z, '<path d="M12 2l3 7 7.5.6-5.7 5 1.8 7.4L12 18l-6.6 4 1.8-7.4L1.5 9.6 9 9z"/>', '0 0 24 24').replace('stroke-width="2"', 'stroke-width="1.4"'),
  google: (z = 20) => `<svg width="${z}" height="${z}" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.3 5.7c4.3-4 7-9.9 7-17.2z"/><path fill="#FBBC05" d="M10.5 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.2 1.5-5.1 2.4-8.6 2.4-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>`,
  // Laurel sprig, echoes the logo wreath
  sprig: (w = 70, flip = false) => `<svg width="${w}" height="${w * 0.4}" viewBox="0 0 70 28" ${flip ? 'style="transform:scaleX(-1)"' : ''} fill="none" stroke="${P}" stroke-width="1.6" stroke-linecap="round"><path d="M2 22C20 22 40 18 66 6"/><path d="M14 21c-2-5 1-8 4-9-1 4-1 7-4 9zM26 19c-2-5 1-8 4-10-1 4-1 8-4 10zM38 16c-1-5 2-8 5-10-1 4-2 8-5 10zM50 12c-1-4 2-7 5-8-1 4-2 6-5 8z" fill="${P}" fill-opacity="0.25"/><path d="M18 22c4 3 8 3 11 1-4-2-7-2-11-1zM30 20c4 3 8 2 11 0-4-2-7-2-11 0zM42 17c4 2 8 1 10-1-4-1-7-1-10 1z" fill="${P}" fill-opacity="0.25"/></svg>`,
  heartDrawn: (w = 90) => `<svg width="${w}" height="${w * 0.85}" viewBox="0 0 100 85" fill="none" stroke="${P}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M50 78C30 63 8 48 8 27 8 14 18 6 29 6c9 0 16 5 21 14 5-9 12-14 21-14 11 0 21 8 21 21 0 21-22 36-42 51z"/><path d="M47 74C29 60 13 47 12 29" opacity="0.5"/></svg>`,
};
module.exports = icons;

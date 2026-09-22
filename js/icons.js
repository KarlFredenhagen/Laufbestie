// Einfarbige Strich-Icons statt Emojis, im Stil der Essensbestie: sie
// nehmen die Textfarbe an und passen zu jeder Palette.
export const ICONS = {
  run:      '<path d="M2.6 17.8c0-1.2.9-2.1 2.1-2l1.9.1 2.3-2.6c1.7-1.9 4.1-3 6.6-3 2.5 0 4.7 1.1 6 2.9.9 0 1.7.7 1.7 1.9 0 1.6-1.3 2.7-2.9 2.7H4.5c-1 0-1.9-.9-1.9-2Z"/><path d="M2.6 19.4h18.7"/><path d="M10.8 12.6l1.6-2M13.4 11.6l1.6-1.8"/>',
  target:   '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.4"/>',
  calendar: '<rect x="3.4" y="5" width="17.2" height="15.6" rx="2.4"/><path d="M3.4 9.8h17.2M8 3v3.6M16 3v3.6"/>',
  list:     '<path d="M8.4 6h12.2M8.4 12h12.2M8.4 18h12.2"/><path d="M3.6 6h.02M3.6 12h.02M3.6 18h.02"/>',
  chart:    '<path d="M3 20.4h18"/><path d="M6.4 20.4v-5.8M12 20.4V6.2M17.6 20.4v-8.6"/>',
  gear:     '<path d="M3.4 6.6h8.2M17.4 6.6h3.2M3.4 12h2.2M11.6 12h9M3.4 17.4h8.2M17.4 17.4h3.2"/><circle cx="14.5" cy="6.6" r="2.4"/><circle cx="8.6" cy="12" r="2.4"/><circle cx="14.5" cy="17.4" r="2.4"/>',
  plus:     '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
  close:    '<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>',
  check:    '<path d="m5.2 12.6 4.6 4.6L18.8 7.4"/>',
  edit:     '<path d="M12.6 4.6H5.4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.2"/><path d="M18 3.2a1.9 1.9 0 0 1 2.8 2.8L12.4 14.4l-3.6.8.8-3.6Z"/>',
  trash:    '<path d="M4.4 7h15.2"/><path d="M9.4 7V4.8a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4V7"/><path d="M6.4 7l.9 12a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.9-12"/><path d="M10.2 11v6M13.8 11v6"/>',
  search:   '<circle cx="10.8" cy="10.8" r="7"/><path d="m20.4 20.4-4.6-4.6"/>',
  warn:     '<path d="M12 3.6 21.4 20H2.6Z"/><path d="M12 9.6v4.6M12 17.4h.02"/>',
  refresh:  '<path d="M20.2 11.4A8.2 8.2 0 0 0 6.3 6.3L3.4 9"/><path d="M3.4 4.4V9h4.6"/><path d="M3.8 12.6a8.2 8.2 0 0 0 13.9 5.1l2.9-2.7"/><path d="M20.6 19.6V15H16"/>',
  heart:    '<path d="M12 20.2s-7.8-4.7-9.6-10C1.2 6.7 3 3.4 6.4 3c2-.2 3.7.9 5.6 3 1.9-2.1 3.6-3.2 5.6-3 3.4.4 5.2 3.7 4 7.2-1.8 5.3-9.6 10-9.6 10Z"/>',
  clock:    '<circle cx="12" cy="12.6" r="8.4"/><path d="M12 8.2v4.4l3 2M9.4 2.6h5.2"/>',
  mountain: '<path d="m3 19 6.4-11 3.6 5.6L15 9.4 21 19Z"/><circle cx="8" cy="6.6" r="1.6"/>',
  flame:    '<path d="M12 21.4c3.7 0 6.2-2.4 6.2-5.8 0-3.9-3.4-5.9-4.4-9.3-1.9 1.5-2.4 3.4-2.4 4.9 0-1-.9-2.5-1.9-3.5-1.5 2-3.7 4.4-3.7 7.9 0 3.4 2.5 5.8 6.2 5.8Z"/>',
  star:     '<path d="m12 3.4 2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6Z"/>',
  chev:     '<path d="m9 6 6.4 6L9 18"/>',
  chevDown: '<path d="m6 9 6 6.4L18 9"/>',
  download: '<path d="M12 3.4v12.4M7.4 11.4l4.6 4.6 4.6-4.6"/><path d="M4.4 18.4v1.4a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8v-1.4"/>',
  upload:   '<path d="M12 20.6V8.2M7.4 12.6 12 8l4.6 4.6"/><path d="M4.4 18.4v1.4a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8v-1.4"/>',
  eye:      '<path d="M2.2 12S5.8 5.4 12 5.4 21.8 12 21.8 12 18.2 18.6 12 18.6 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="3.2"/>',
  eyeOff:   '<path d="M9.6 5.7A9.6 9.6 0 0 1 12 5.4c6.2 0 9.8 6.6 9.8 6.6a17 17 0 0 1-3 3.9M6.2 7.4A17.4 17.4 0 0 0 2.2 12S5.8 18.6 12 18.6c1.5 0 2.8-.4 4-.9"/><path d="m3 3 18 18"/><path d="M10 10a3.2 3.2 0 0 0 4.2 4.2"/>',
  lock:     '<rect x="4.4" y="10.4" width="15.2" height="10" rx="2.4"/><path d="M7.4 10.4V7.2a4.6 4.6 0 0 1 9.2 0v3.2"/>',
  trophy:   '<path d="M7 4.4h10v5.2a5 5 0 0 1-10 0Z"/><path d="M7 5.6H4.2a.9.9 0 0 0-.9 1c.3 2.4 1.8 3.9 3.9 4.2M17 5.6h2.8a.9.9 0 0 1 .9 1c-.3 2.4-1.8 3.9-3.9 4.2"/><path d="M12 14.6v3M8.6 20.6h6.8"/>',
  info:     '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.6h.02"/>',
  sparkle:  '<path d="M11 3.4 12.7 8 17.3 9.7 12.7 11.4 11 16 9.3 11.4 4.7 9.7 9.3 8Z"/><path d="M18.2 14.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
  wifi:     '<path d="M2.6 8.8a13.6 13.6 0 0 1 18.8 0"/><path d="M5.8 12.6a9.2 9.2 0 0 1 12.4 0"/><path d="M9 16.4a4.6 4.6 0 0 1 6 0"/><path d="M12 20h.02"/>',
  bolt:     '<path d="M13.2 2.8 5 14h6l-.6 7.2L18 10h-6z"/>'
};

export function ico(name, size){
  const p = ICONS[name];
  if(!p) return '';
  return `<svg class="i" viewBox="0 0 24 24" width="${size||18}" height="${size||18}" fill="none"
    stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${p}</svg>`;
}

// Fuellt alle [data-ico]-Platzhalter im statischen HTML.
export function paintIcons(root){
  (root || document).querySelectorAll('[data-ico]').forEach(el => {
    if(el.dataset.icoDone) return;
    el.innerHTML = ico(el.dataset.ico, el.dataset.icoSize);
    el.dataset.icoDone = '1';
  });
}

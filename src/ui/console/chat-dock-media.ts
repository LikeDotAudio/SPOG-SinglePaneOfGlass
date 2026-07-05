// src/ui/console/chat-dock-media — pure helpers for the PRODUCTION CHAT dock:
// endpoint discovery, thread keys, HTML-escaping/autolink, timestamps, and the
// front-end image downscaler (no media server).

import type { Endpoint, ChatMsg } from './chat-dock-types.js';

export const DEFAULT_COLOR = '57,211,83';   // comms green
export const slug = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** One thread per unordered pair, so A▸B and B▸A share the same transcript. */
export const pairKey = (a: string, b: string): string => [slug(a), slug(b)].sort().join('~');

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);
export const hms = (ts: number): string => new Date(ts).toISOString().slice(11, 19);

/** HTML-escape then turn bare URLs into links. */
export function autolink(text: string): string {
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

/** Downscale an image file to a small JPEG data-URI (front-end sim: no media server). */
export function downscale(file: File, max = 512, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cw = Math.max(1, Math.round(img.width * scale));
        const ch = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const g = c.getContext('2d');
        if (!g) { resolve(String(fr.result)); return; }
        g.drawImage(img, 0, 0, cw, ch);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}

/** All destination productions, read from the footer tab strip (every leaf tab is a
 *  production; nested group headers are `.lcars-group-label`, not `.lcars-tab`). */
export function productions(): Endpoint[] {
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('#production-tabs .lcars-tab'));
  const seen = new Set<string>();
  const out: Endpoint[] = [];
  for (const t of tabs) {
    const name = (t.textContent || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, color: t.style.getPropertyValue('--lcars').trim() || DEFAULT_COLOR });
  }
  return out;
}

export const colorOf = (name: string): string => productions().find((p) => p.name === name)?.color || DEFAULT_COLOR;

export function summarize(m: ChatMsg): string {
  if (m.kind === 'image') return '[image]' + (m.text ? ' ' + m.text : '');
  if (m.kind === 'link') return '🔗 ' + (m.text ? m.text + ' — ' : '') + (m.href ?? '');
  return m.text ?? '';
}

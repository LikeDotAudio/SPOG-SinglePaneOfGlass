// src/ui/console/schedule — the production SCHEDULE overlay (port of js/schedule.js).
// Clicking the clock's seconds-dots opens today's timeline: each show, its room,
// and the crew ROLES booked to the slot (the live slot is highlighted). This is
// the surface of the Schedule → Timeline → Resource-Booking model the access
// system (auth-panel) draws each operator's scope from.
import { addStyles } from '../dom.js';

export interface Slot { s: number; e: number; show: string; room: string; crew: string[]; resources?: string[] }

// The repeating schedule is a DATA MODEL read from Routes/Schedule/Schedule.json
// (like the Sources/Destinations trees) — not hardcoded. `loadSchedule()` populates
// SCHEDULE at boot; it stays a LIVE array (mutated in place) so every importer — the
// overlay here + the timeline projection (captains-log-timeline-data) — sees the
// loaded slots. Empty until loaded (zero-backend: a missing file yields no schedule,
// exactly like a missing Routes tree).
export const SCHEDULE: Slot[] = [];

/** Fetch + populate the schedule from Routes/Schedule/Schedule.json. Mutates SCHEDULE
 *  in place and seeds each show's identity colour in file order. Call once at boot. */
export async function loadSchedule(): Promise<void> {
  try {
    const res = await fetch('Routes/Schedule/Schedule.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json() as { slots?: Slot[]; colors?: Record<string, string> } | Slot[];
    const slots = Array.isArray(data) ? data : data.slots;
    const colors = Array.isArray(data) ? undefined : data.colors;
    // Show identity colours are part of the data model: seed them from the file so a
    // show reads the same hue everywhere. Shows without an explicit colour fall back
    // to the palette (assign-on-first-seen, in file order).
    if (colors) for (const [show, c] of Object.entries(colors)) setShowColor(show, c);
    if (Array.isArray(slots) && slots.length) {
      SCHEDULE.length = 0;
      SCHEDULE.push(...slots);
      for (const sl of SCHEDULE) showColor(sl.show);
    }
  } catch { /* zero-backend: no schedule file → empty schedule */ }
}

// Every production/show earns its OWN identity colour, stable across the app so the
// same show reads the same hue on the schedule overlay AND the timeline (its room lane
// and every crew-role lane) — you can trace one production's crew + actions by colour.
// Assign-on-first-seen over a wide palette; pre-seeded from SCHEDULE below so the order
// is deterministic regardless of which surface asks for a colour first.
export const SHOW_COLORS = [
  '#FF9C63', '#3FC1C9', '#A06EB4', '#6cdf4a', '#6FC8F0', '#C2B74B', '#ff5fa2', '#cc6a3a',
  '#9C6B9C', '#39d353', '#e0524a', '#5b8def', '#e0b53a', '#d8b4e2', '#4ad6c0', '#f08fb0',
  '#b0d04a', '#8f9cf0', '#f0a24a', '#7ad0f0',
];
const showColorMap = new Map<string, string>();
/** Stable identity colour for a production/show (same string → same hue, app-wide). */
export function showColor(show: string): string {
  if (!showColorMap.has(show)) showColorMap.set(show, SHOW_COLORS[showColorMap.size % SHOW_COLORS.length]!);
  return showColorMap.get(show)!;
}
/** Set a show's identity colour explicitly (used to seed from the schedule data model). */
export function setShowColor(show: string, color: string): void { showColorMap.set(show, color); }

const fmt = (h: number): string => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// Crew roles map to the three divisions — Command (red), Operations (gold), Sciences (blue).
function division(role: string): [string, string] {
  if (/captain|first officer|director|conn|helm|\btd\b/i.test(role)) return ['Command', '#e0524a'];
  if (/science|metadata|analytics|medical|counselor/i.test(role)) return ['Sciences', '#5b8def'];
  return ['Operations', '#e0b53a'];
}

const SCHED_CSS = `
.sc-ov{position:fixed;inset:0;z-index:3100;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 30%,rgba(13,23,48,.92),rgba(3,6,15,.96));font-family:Arial,Helvetica,sans-serif;}
.sc-ov.open{display:flex;}
.sc-box{width:min(960px,94vw);max-height:90vh;overflow:auto;background:#0a1326;border:1px solid #1d2942;border-radius:16px;padding:26px;}
.sc-box h2{margin:0 0 2px;color:#fff;font-size:22px;letter-spacing:2px;}
.sc-box p{margin:0 0 20px;color:#7e93b5;font-size:12px;letter-spacing:1px;}
.sc-slot{display:grid;grid-template-columns:120px 1fr;gap:14px;border-radius:12px;border:1px solid #2c3e5e;background:#0c1730;padding:14px;margin-bottom:12px;}
.sc-slot.live{border-color:#ff3b3b;box-shadow:0 0 16px rgba(255,59,59,.35);}
.sc-time{font:bold 15px 'Courier New',monospace;color:#6FC8F0;letter-spacing:1px;}
.sc-time .badge{display:inline-block;margin-top:8px;font:900 9px sans-serif;letter-spacing:1px;border-radius:5px;padding:3px 7px;background:#1d2942;color:#9fb6cc;}
.sc-slot.live .sc-time .badge{background:#ff3b3b;color:#fff;}
.sc-show b{display:block;color:#fff;font-size:17px;letter-spacing:1px;}
.sc-room{color:#9fd6ff;font-size:12px;letter-spacing:1px;margin:3px 0 10px;}
.sc-crew{display:flex;flex-wrap:wrap;gap:6px;}
.sc-resources{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.sc-role{font:bold 10px sans-serif;letter-spacing:.5px;border-radius:6px;padding:5px 9px;background:#13233c;color:#cfe6ff;border:1px solid #2c3e5e;}
.sc-resource{font:bold 10px sans-serif;letter-spacing:.5px;border-radius:6px;padding:5px 9px;background:#1a0e28;color:#d8b4e2;border:1px solid #4a2d6b;}
.sc-legend{display:flex;gap:16px;margin:-8px 0 16px;font:bold 11px sans-serif;letter-spacing:1px;}
.sc-hint{color:#6b82a3;font-size:11px;letter-spacing:1px;margin-top:6px;}`;

let ov: HTMLElement | null = null;

function ensure(): HTMLElement {
  addStyles('sched-styles', SCHED_CSS);
  if (ov) return ov;
  ov = document.createElement('div');
  ov.className = 'sc-ov';
  ov.innerHTML = `<div class="sc-box"><h2>PRODUCTION SCHEDULE</h2><p>TODAY · TIMELINE · ROOM & CREW BOOKING</p><div class="sc-legend"><span style="color:#e0524a">■ Command</span><span style="color:#e0b53a">■ Operations</span><span style="color:#5b8def">■ Sciences</span><span style="color:#d8b4e2">■ Booked Resources</span></div><div class="sc-list"></div><div class="sc-hint">Crew shown as ROLES booked to the slot — the access system loads each operator's scope from here. Resources are automatically reserved and relinquished by the schedule.</div></div>`;
  ov.addEventListener('click', (e) => { if (e.target === ov) ov?.classList.remove('open'); });
  document.body.appendChild(ov);
  return ov;
}

function nowHours(): number {
  try { const d = new Date(); return d.getHours() + d.getMinutes() / 60; } catch { return 14.2; }
}

function build(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>('.sc-list');
  if (!list) return;
  list.innerHTML = '';
  const now = nowHours();
  SCHEDULE.forEach((sl) => {
    const live = now >= sl.s && now < sl.e;
    const pc = showColor(sl.show);
    const el = document.createElement('div');
    el.className = 'sc-slot' + (live ? ' live' : '');
    el.style.borderLeft = `4px solid ${pc}`;   // production identity bar
    el.innerHTML = `<div class="sc-time">${fmt(sl.s)}<br>–${fmt(sl.e)}<div class="badge">${live ? '● LIVE NOW' : 'SCHEDULED'}</div></div>
      <div class="sc-show"><b style="color:${pc}">${sl.show}</b><div class="sc-room">▣ ${sl.room}</div>
        <div class="sc-crew">${sl.crew.map((r) => { const [d, c] = division(r); return `<span class="sc-role" style="border-color:${c};color:${c}" title="${d} division">${r}</span>`; }).join('')}</div>
        ${sl.resources ? `<div class="sc-resources">${sl.resources.map((res) => `<span class="sc-resource" title="Booked Remote Resource">⚡ ${res}</span>`).join('')}</div>` : ''}
      </div>`;
    list.appendChild(el);
  });
}

/** Open the production schedule overlay (wired to the clock's seconds-dots). */
export function showSchedule(): void {
  const root = ensure();
  build(root);
  root.classList.add('open');
}

// src/ui/console/schedule — the production SCHEDULE overlay (port of js/schedule.js).
// Clicking the clock's seconds-dots opens today's timeline: each show, its room,
// and the crew ROLES booked to the slot (the live slot is highlighted). This is
// the surface of the Schedule → Timeline → Resource-Booking model the access
// system (auth-panel) draws each operator's scope from.
import { addStyles } from '../dom.js';

export interface Slot { s: number; e: number; show: string; room: string; crew: string[]; resources?: string[] }

// A 24-hour global news operation — world bureaus staggered across time zones, a
// prime-time PEAK of five concurrent productions (18:30–19:30 across five rooms),
// and a deliberate crew clash: Sports Tonight and Evening Weather BOTH need Ops at
// 19:00 (and the Flash desk pulls a second Comms) — an overlap the timeline flags
// as "impossible without another person". Every slot also earns a 45-minute
// rehearsal band, added by the timeline projection (captains-log-timeline-data).
export const SCHEDULE: Slot[] = [
  { s: 0, e: 5, show: 'Overnight Desk', room: 'Newsroom Flash Desk', crew: ['Conn · TD', 'Comms'], resources: ['Wire Service Feed'] },
  { s: 1, e: 2, show: 'World News · Tokyo', room: 'Studio 5 · Tokyo Bureau', crew: ['First Officer · Director', 'Conn · TD', 'Comms'], resources: ['Tokyo Bureau Fiber'] },
  { s: 3, e: 4, show: 'World News · Sydney', room: 'Studio 2 · 2nd Floor', crew: ['First Officer · Director', 'Conn · TD', 'Ops'], resources: ['Sydney Bureau Fiber'] },
  { s: 5, e: 6, show: 'First Light', room: 'Studio 3 · 3rd Floor', crew: ['First Officer · Director', 'Chief Engineer', 'Comms'], resources: ['Sunrise Roof Cam'] },
  { s: 6, e: 9, show: 'Morning Show · East', room: 'Primary Control Room', crew: ['Captain · EP', 'First Officer · Director', 'Conn · TD', 'Chief Engineer', 'Comms', 'Ops'], resources: ['Correspondent Live Shot', 'Remote Cam 3'] },
  { s: 7, e: 8, show: 'World News · London', room: 'Studio 4 · London Bureau', crew: ['First Officer · Director', 'Conn · TD', 'Comms'], resources: ['London Bureau Fiber'] },
  { s: 9, e: 9.5, show: 'Market Watch', room: 'Studio 2 · 2nd Floor', crew: ['First Officer · Director', 'Science'], resources: ['Exchange Data Feed'] },
  { s: 10, e: 11, show: 'Midmorning Report', room: 'Studio 3 · 3rd Floor', crew: ['First Officer · Director', 'Conn · TD', 'Tactical'], resources: ['Traffic Chopper'] },
  { s: 12, e: 12.5, show: 'News at Noon', room: 'Primary Control Room', crew: ['First Officer · Director', 'Conn · TD', 'Chief Engineer', 'Comms'], resources: ['Guest Skype Feed'] },
  { s: 12, e: 13, show: 'World News · London', room: 'Studio 4 · London Bureau', crew: ['First Officer · Director', 'Conn · TD', 'Comms'], resources: ['London Bureau Fiber'] },
  { s: 14, e: 15, show: 'Afternoon Briefing', room: 'Studio 2 · 2nd Floor', crew: ['First Officer · Director', 'Tactical', 'Ops'], resources: ['Press Room Pool'] },
  { s: 17, e: 18, show: 'Early Evening News', room: 'Primary Control Room', crew: ['First Officer · Director', 'Conn · TD', 'Chief Engineer', 'Comms'], resources: ['Correspondent Live Shot'] },
  { s: 18, e: 20, show: 'Sports Tonight', room: 'Studio 3 · 3rd Floor', crew: ['Captain · EP', 'First Officer · Director', 'Conn · TD', 'Chief Engineer', 'Tactical', 'Comms', 'Ops', 'Science'], resources: ['Stadium Feed A', 'Stadium Feed B'] },
  { s: 18.5, e: 19.5, show: 'World News · London', room: 'Studio 4 · London Bureau', crew: ['First Officer · Director', 'Conn · TD', 'Comms'], resources: ['London Bureau Fiber'] },
  { s: 19, e: 21, show: 'Prime Time News', room: 'Primary Control Room', crew: ['Captain · EP', 'First Officer · Director', 'Conn · TD', 'Chief Engineer', 'Tactical', 'Comms'], resources: ['Helicopter Cam', 'White House Briefing'] },
  { s: 19, e: 19.5, show: 'Evening Weather', room: 'Weather Center', crew: ['First Officer · Director', 'Ops'], resources: ['Doppler Radar Array'] },
  { s: 19.25, e: 19.5, show: 'Flash Update', room: 'Newsroom Flash Desk', crew: ['First Officer · Director', 'Comms'], resources: ['Breaking Wire'] },
  { s: 21, e: 22, show: 'Late Edition', room: 'Studio 2 · 2nd Floor', crew: ['First Officer · Director', 'Conn · TD', 'Comms'], resources: ['Late Guest Feed'] },
  { s: 22, e: 23, show: 'World News · Tokyo AM', room: 'Studio 5 · Tokyo Bureau', crew: ['First Officer · Director', 'Conn · TD', 'Comms'], resources: ['Tokyo Bureau Fiber'] },
  { s: 23, e: 24, show: 'Overnight Handoff', room: 'Newsroom Flash Desk', crew: ['Conn · TD', 'Comms'], resources: ['Wire Service Feed'] },
];

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
    const el = document.createElement('div');
    el.className = 'sc-slot' + (live ? ' live' : '');
    el.innerHTML = `<div class="sc-time">${fmt(sl.s)}<br>–${fmt(sl.e)}<div class="badge">${live ? '● LIVE NOW' : 'SCHEDULED'}</div></div>
      <div class="sc-show"><b>${sl.show}</b><div class="sc-room">▣ ${sl.room}</div>
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

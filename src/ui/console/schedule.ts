import { addStyles, el } from '../dom.js';
import { fetchJSON } from '../../platform/discovery.js';
import { putDraft } from '../../platform/routes-store.js';
import { role } from '../../platform/auth.js';
import { SCHED_CSS } from './schedule-css.js';

export interface Slot { s: number; e: number; show: string; room: string; floor?: string; controlRoom?: string; crew: string[]; resources?: string[] }

export const SCHEDULE: Slot[] = [];
let RAW_SCHEDULE_DATA: any = null;

export async function loadSchedule(): Promise<void> {
  try {
    const data = await fetchJSON<any>('Routes/Schedule/Schedule.json');
    if (!data) return;
    RAW_SCHEDULE_DATA = data;
    const slots = Array.isArray(data) ? data : data.slots;
    const colors = Array.isArray(data) ? undefined : data.colors;
    if (colors) for (const [show, c] of Object.entries(colors)) setShowColor(show, c);
    if (Array.isArray(slots) && slots.length) {
      SCHEDULE.length = 0;
      SCHEDULE.push(...slots);
      for (const sl of SCHEDULE) showColor(sl.show);
    }
  } catch { /* zero-backend: no schedule file → empty schedule */ }
}

export const SHOW_COLORS = [
  '#FF9C63', '#3FC1C9', '#A06EB4', '#6cdf4a', '#6FC8F0', '#C2B74B', '#ff5fa2', '#cc6a3a',
  '#9C6B9C', '#39d353', '#e0524a', '#5b8def', '#e0b53a', '#d8b4e2', '#4ad6c0', '#f08fb0',
  '#b0d04a', '#8f9cf0', '#f0a24a', '#7ad0f0',
];
const showColorMap = new Map<string, string>();
export function showColor(show: string): string {
  if (!showColorMap.has(show)) showColorMap.set(show, SHOW_COLORS[showColorMap.size % SHOW_COLORS.length]!);
  return showColorMap.get(show)!;
}
export function setShowColor(show: string, color: string): void { showColorMap.set(show, color); }

const fmt = (h: number): string => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

function division(role: string): [string, string] {
  if (/captain|first officer|director|conn|helm|\btd\b/i.test(role)) return ['Command', '#e0524a'];
  if (/science|metadata|analytics|medical|counselor/i.test(role)) return ['Sciences', '#5b8def'];
  return ['Operations', '#e0b53a'];
}



let ov: HTMLElement | null = null;
let editMode = false;
let editingIndex = -1;

function ensure(): HTMLElement {
  addStyles('sched-styles', SCHED_CSS);
  if (ov) return ov;
  ov = document.createElement('div');
  ov.className = 'sc-ov';
  ov.innerHTML = `<div class="sc-box">
    <h2>PRODUCTION SCHEDULE <button class="toggle-edit-btn">Toggle Edit Mode</button></h2>
    <p>TODAY · TIMELINE · ROOM & CREW BOOKING</p>
    <div class="sc-legend"><span style="color:#e0524a">■ Command</span><span style="color:#e0b53a">■ Operations</span><span style="color:#5b8def">■ Sciences</span><span style="color:#d8b4e2">■ Booked Resources</span></div>
    <div class="sc-list"></div>
    <div class="sc-hint">Crew shown as ROLES booked to the slot — the access system loads each operator's scope from here. Resources are automatically reserved and relinquished by the schedule.</div>
  </div>`;
  ov.addEventListener('click', (e) => {
    if (e.target === ov) {
      ov?.classList.remove('open');
      editingIndex = -1;
      editMode = false;
    }
  });
  const toggleBtn = ov.querySelector('.toggle-edit-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (role().id !== 'ep' && role().id !== 'director') {
        alert('Schedule editing is locked to Captains and First Officers.');
        return;
      }
      editMode = !editMode;
      editingIndex = -1;
      build(ov!);
    });
  }
  document.body.appendChild(ov);
  return ov;
}

function nowHours(): number {
  try { const d = new Date(); return d.getHours() + d.getMinutes() / 60; } catch { return 14.2; }
}

function saveScheduleData(): void {
  const dataToSave = RAW_SCHEDULE_DATA ? { ...RAW_SCHEDULE_DATA, slots: SCHEDULE } : { slots: SCHEDULE };
  if (!Array.isArray(dataToSave)) {
    dataToSave.colors = dataToSave.colors || {};
    for (const sl of SCHEDULE) dataToSave.colors[sl.show] = showColor(sl.show);
  }
  putDraft('Routes/Schedule/Schedule.json', dataToSave);
  editingIndex = -1;
  if (ov) build(ov);
  
  // Re-emit custom event so timeline picks it up if needed, or just reload data
  // But reloading might be safer
}

function renderEditor(sl: Slot, idx: number, list: HTMLElement): void {
  const elBox = document.createElement('div');
  elBox.className = 'sc-slot';
  elBox.style.borderLeft = `4px solid #4a2d6b`;
  
  elBox.innerHTML = `
    <div class="sc-editor">
      <div style="display:flex;gap:8px;">
        <label>Start (decimal hr) <input type="number" step="0.25" class="ed-s" value="${sl.s}" /></label>
        <label>End (decimal hr) <input type="number" step="0.25" class="ed-e" value="${sl.e}" /></label>
      </div>
      <label>Show Name <input type="text" class="ed-show" value="${sl.show}" /></label>
      <div style="display:flex;gap:8px;">
        <label style="flex:1">Floor
          <select class="ed-floor" style="width:100%">
            ${['', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'].map(f => `<option value="${f}" ${sl.floor===f?'selected':''}>${f||'-- None --'}</option>`).join('')}
          </select>
        </label>
        <label style="flex:1">Control Room
          <select class="ed-cr" style="width:100%">
             ${['', 'CR 1', 'CR 2', 'CR 3', 'CR 4', 'NOC', 'Remote'].map(c => `<option value="${c}" ${sl.controlRoom===c?'selected':''}>${c||'-- None --'}</option>`).join('')}
          </select>
        </label>
      </div>
      <label>Room (legacy) <input type="text" class="ed-room" value="${sl.room||''}" /></label>
      <label style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        Crew Members 
        <button type="button" class="add-crew-btn" style="padding:4px 8px;font-size:10px;background:#39D353;color:#000;border:none;border-radius:4px;cursor:pointer;">+ Add Crew</button>
      </label>
      <div class="crew-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;"></div>
      <label>Resources (comma separated) <input type="text" class="ed-res" value="${(sl.resources||[]).join(', ')}" /></label>
      <div class="sc-editor-actions">
        <button class="save">Save Slot</button>
        <button class="cancel">Cancel</button>
      </div>
    </div>
  `;
  
  const crewList = elBox.querySelector('.crew-list') as HTMLElement;
  const addCrewBtn = elBox.querySelector('.add-crew-btn') as HTMLButtonElement;
  const roles = ['TD', 'Director', 'Producer', 'Audio (A1)', 'Audio (A2)', 'Video (V1)', 'Video (V2)', 'Graphics', 'Engineer', 'Comm', 'Prompter', 'Camera', 'Conn', 'Helm'];
  
  const renderCrewSelect = (val = '') => {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.gap = '4px';
    const sel = document.createElement('select');
    sel.className = 'ed-crew-sel';
    sel.style.flex = '1';
    sel.innerHTML = `<option value="">-- Select Role --</option>` + roles.map(r => `<option value="${r}" ${val===r?'selected':''}>${r}</option>`).join('');
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = 'X'; 
    del.style.padding = '4px 8px'; del.style.background = '#B46757'; del.style.color = '#fff'; del.style.border = 'none'; del.style.borderRadius = '4px'; del.style.cursor = 'pointer';
    del.onclick = () => row.remove();
    row.appendChild(sel); row.appendChild(del);
    crewList.appendChild(row);
  };
  
  (sl.crew || []).forEach(c => renderCrewSelect(c));
  addCrewBtn.onclick = () => renderCrewSelect();
  
  elBox.querySelector('.save')?.addEventListener('click', () => {
    sl.s = Number((elBox.querySelector('.ed-s') as HTMLInputElement).value) || 0;
    sl.e = Number((elBox.querySelector('.ed-e') as HTMLInputElement).value) || 0;
    sl.show = (elBox.querySelector('.ed-show') as HTMLInputElement).value;
    sl.room = (elBox.querySelector('.ed-room') as HTMLInputElement).value;
    sl.floor = (elBox.querySelector('.ed-floor') as HTMLSelectElement).value;
    sl.controlRoom = (elBox.querySelector('.ed-cr') as HTMLSelectElement).value;
    
    const crewSels = Array.from(elBox.querySelectorAll('.ed-crew-sel')) as HTMLSelectElement[];
    sl.crew = crewSels.map(s => s.value).filter(Boolean);
    
    sl.resources = (elBox.querySelector('.ed-res') as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean);
    if (idx === SCHEDULE.length) SCHEDULE.push(sl);
    SCHEDULE.sort((a,b) => a.s - b.s);
    saveScheduleData();
  });
  elBox.querySelector('.cancel')?.addEventListener('click', () => {
    editingIndex = -1;
    build(ov!);
  });
  list.appendChild(elBox);
}

function build(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>('.sc-list');
  if (!list) return;
  list.innerHTML = '';
  const now = nowHours();
  const toggleBtn = root.querySelector('.toggle-edit-btn') as HTMLElement;
  if (toggleBtn) {
    if (role().id === 'ep' || role().id === 'director') toggleBtn.style.display = 'block';
    else toggleBtn.style.display = 'none';
  }
  
  SCHEDULE.forEach((sl, idx) => {
    if (editingIndex === idx) {
      renderEditor(sl, idx, list);
      return;
    }
    const live = now >= sl.s && now < sl.e;
    const reh = now >= sl.s - 0.75 && now < sl.s;
    const tear = now >= sl.e && now < sl.e + 0.5;
    const locked = live || reh || tear;
    const pc = showColor(sl.show);
    const elNode = document.createElement('div');
    elNode.className = 'sc-slot' + (live ? ' live' : '') + (reh ? ' reh' : '') + (tear ? ' tear' : '');
    elNode.style.borderLeft = `4px solid ${pc}`;   // production identity bar
    elNode.innerHTML = `<div class="sc-time">${fmt(sl.s)}<br>–${fmt(sl.e)}<div class="badge">${live ? '● LIVE NOW' : reh ? '● REHEARSAL' : tear ? '● TEARDOWN' : 'SCHEDULED'}</div></div>
      <div class="sc-show"><b style="color:${pc}">${sl.show}</b><div class="sc-room">▣ ${sl.room}</div>
        <div class="sc-crew">${sl.crew.map((r) => { const [d, c] = division(r); return `<span class="sc-role" style="border-color:${c};color:${c}" title="${d} division">${r}</span>`; }).join('')}</div>
        ${sl.resources ? `<div class="sc-resources">${sl.resources.map((res) => `<span class="sc-resource" title="Booked Remote Resource">⚡ ${res}</span>`).join('')}</div>` : ''}
      </div>
      ${editMode && !locked ? '<button class="sc-edit-btn">Edit</button>' : editMode && locked ? '<div class="sc-locked-msg">Locked (Live/Reh/Tear)</div>' : ''}`;
      
    if (editMode && !locked) {
      elNode.querySelector('.sc-edit-btn')?.addEventListener('click', () => {
        editingIndex = idx;
        build(root);
      });
    }
    list.appendChild(elNode);
  });
  
  if (editMode && editingIndex === SCHEDULE.length) {
    renderEditor({ s: 12, e: 13, show: 'New Show', room: 'Studio 1', crew: ['Director'], resources: [] }, SCHEDULE.length, list);
  } else if (editMode) {
    const newBtn = document.createElement('button');
    newBtn.className = 'sc-new-btn';
    newBtn.textContent = '+ Create New Show';
    newBtn.addEventListener('click', () => {
      editingIndex = SCHEDULE.length;
      build(root);
    });
    list.appendChild(newBtn);
  }
}

export function showSchedule(editShowName?: string): void {
  const root = ensure();
  if (editShowName && (role().id === 'ep' || role().id === 'director')) {
    const idx = SCHEDULE.findIndex((s) => s.show === editShowName);
    if (idx !== -1) {
      const sl = SCHEDULE[idx]!;
      const now = nowHours();
      if (now >= sl.s - 0.75 && now < sl.e + 0.5) {
        alert(`${sl.show} cannot be edited while on air, in rehearsal, or during teardown.`);
      } else {
        editMode = true;
        editingIndex = idx;
      }
    }
  }
  build(root);
  root.classList.add('open');
  if (editMode && editingIndex !== -1) {
    // scroll to it
    setTimeout(() => {
      const ed = root.querySelector('.sc-editor');
      if (ed) ed.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }
}

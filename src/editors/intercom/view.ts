// src/editors/intercom/view — faithful port of renderIntercom() driven from the
// typed EditorContext (no DOM scraping). Builds the key panel, talk/listen
// buttons, talk-group builder, the random "incoming" listen flicker, and the
// IFB / beltpacks / matrix sub-cards.

import type { EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { el } from '../../ui/dom.js';
import { injectIntercomStyles } from './styles.js';
import { createIntercomState, DEFAULT_KEYS, type TalkGroup } from './state.js';

function resolveKeys(ctx: EditorContext): string[] {
  // Legacy gatherSources(twist) → ctx.sources; then config.inputs; then defaults.
  const fromSources = ctx.sources.map((s) => s.label);
  if (fromSources.length) return fromSources;
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) return [...inputs];
  return [...DEFAULT_KEYS];
}

export function renderIntercom(host: HTMLElement, ctx: EditorContext): void {
  injectIntercomStyles();
  // Legacy overlay chrome supplied --ed-color from the production; mirror it so
  // the tool buttons pick up the production colour.
  host.style.setProperty('--ed-color', ctx.production.color);

  const state = createIntercomState(resolveKeys(ctx));
  const { keys } = state;

  // ---- toolbar ----
  const newBtn = el('button', { class: 'ic-tool-btn', dataset: { new: '' } }, ['＋ NEW TALK GROUP']);
  const cancelBtn = el('button', { class: 'ic-tool-btn ghost', dataset: { cancel: '' }, style: 'display:none' }, ['CANCEL']);
  const hint = el('span', { class: 'ic-hint' });
  const toolbar = el('div', { class: 'ic-toolbar' }, [newBtn, cancelBtn, hint]);
  host.appendChild(toolbar);

  const groupsWrap = el('div', { class: 'ic-groups' });
  host.appendChild(groupsWrap);

  const grid = el('div', { class: 'ic-grid' });
  host.appendChild(grid);

  // ---- key panels ----
  const keyEls: HTMLElement[] = [];
  const talkBtns: HTMLButtonElement[] = [];
  const listenBtns: HTMLButtonElement[] = [];
  const vols: HTMLInputElement[] = [];
  keys.forEach((label, i) => {
    const name = el('div', { class: 'ic-name' }, [label]);
    const talkBtn = el('button', { class: 'talk' }, ['TALK']);
    const listenBtn = el('button', { class: 'listen' }, ['LISTEN']);
    const tl = el('div', { class: 'ic-tl' }, [talkBtn, listenBtn]);
    const vol = el('input', {
      class: 'ic-vol',
      type: 'range',
      min: '0',
      max: '100',
      value: String(state.level[i]),
    });
    const k = el('div', { class: 'ic-key' + (i === 4 ? ' live' : '') }, [name, tl, vol]); // CAM 1 on-air (tally)

    name.addEventListener('click', () => setTalk(i, !state.talk[i], true));
    talkBtn.addEventListener('click', () => setTalk(i, !state.talk[i], true));
    listenBtn.addEventListener('click', () => setListen(i, !state.listen[i], true));
    vol.addEventListener('input', () => setLevel(i, +vol.value, true));
    // In group-build mode, a click anywhere on the panel toggles membership
    // (capture phase so it pre-empts the talk/listen handlers above).
    k.addEventListener(
      'click',
      (e) => {
        if (!state.selecting) return;
        e.preventDefault();
        e.stopPropagation();
        if (state.picked.has(i)) state.picked.delete(i);
        else state.picked.add(i);
        k.classList.toggle('picked', state.picked.has(i));
        updateHint();
      },
      true,
    );

    keyEls.push(k);
    talkBtns.push(talkBtn);
    listenBtns.push(listenBtn);
    vols.push(vol);
    grid.appendChild(k);
  });

  // ---- MQTT live-value bridge (advertise / publish / subscribe) ----
  // Per-key TALK, LISTEN and channel LEVEL are the operator-driveable values.
  // Reflect state → DOM, publishing only when the change was LOCAL (from a user
  // event); inbound writes (`publish === false`) apply silently to avoid echo.
  function setTalk(i: number, on: boolean, publish: boolean): void {
    const k = keyEls[i], btn = talkBtns[i];
    if (!k || !btn) return;
    state.talk[i] = on;
    k.classList.toggle('talk', on);
    btn.classList.toggle('on', on);
    if (publish) ctx.services.publishParam?.(`ch${i + 1}_talk`, on, { throttle: false }); // discrete key press
  }
  function setListen(i: number, on: boolean, publish: boolean): void {
    const k = keyEls[i], btn = listenBtns[i];
    if (!k || !btn) return;
    state.listen[i] = on;
    k.classList.toggle('listen', on);
    btn.classList.toggle('on', on);
    if (publish) ctx.services.publishParam?.(`ch${i + 1}_listen`, on, { throttle: false }); // discrete
  }
  function setLevel(i: number, v: number, publish: boolean): void {
    const inp = vols[i];
    if (!inp) return;
    state.level[i] = v;
    inp.value = String(v);
    if (publish) ctx.services.publishParam?.(`ch${i + 1}_level`, v); // fader loop → throttled
  }

  // Advertise the full R/W schema once (one bool talk + bool listen + number level
  // per key). Groups are created at runtime, so they publish without a fixed spec.
  const specs: ParamSpec[] = [];
  keys.forEach((_label, i) => {
    specs.push({ name: `ch${i + 1}_talk`, type: 'bool', writable: true });
    specs.push({ name: `ch${i + 1}_listen`, type: 'bool', writable: true });
    specs.push({ name: `ch${i + 1}_level`, type: 'number', unit: '%', min: 0, max: 100, writable: true });
  });
  ctx.services.advertiseParams?.(specs);

  // Honour inbound writes from the bus / other consoles (apply without re-publishing).
  keys.forEach((_label, i) => {
    ctx.services.onParam?.(`ch${i + 1}_talk`, (v) => setTalk(i, !!v, false));
    ctx.services.onParam?.(`ch${i + 1}_listen`, (v) => setListen(i, !!v, false));
    ctx.services.onParam?.(`ch${i + 1}_level`, (v) => { if (typeof v === 'number') setLevel(i, v, false); });
  });

  // ---- group-build flow ----
  function updateHint(): void {
    hint.textContent = state.selecting ? `SELECT PANELS TO GANG — ${state.picked.size} picked` : '';
  }
  function exitSelect(): void {
    state.selecting = false;
    grid.classList.remove('selecting');
    keyEls.forEach((k) => k.classList.remove('picked'));
    state.picked.clear();
    newBtn.textContent = '＋ NEW TALK GROUP';
    cancelBtn.style.display = 'none';
    updateHint();
  }
  newBtn.addEventListener('click', () => {
    if (!state.selecting) {
      state.selecting = true;
      grid.classList.add('selecting');
      newBtn.textContent = '✓ CREATE GROUP';
      cancelBtn.style.display = '';
      updateHint();
    } else {
      if (state.picked.size) {
        state.groups.push({ name: 'TALK GROUP ' + (state.groups.length + 1), members: [...state.picked], on: false });
        drawGroups();
      }
      exitSelect();
    }
  });
  cancelBtn.addEventListener('click', exitSelect);

  function setGroupOn(g: TalkGroup, on: boolean, publish = false): void {
    g.on = on;
    // Gang the members' TALK latches (publishes each per-key talk when local).
    g.members.forEach((idx) => setTalk(idx, on, publish));
    if (publish) {
      const gi = state.groups.indexOf(g);
      if (gi >= 0) ctx.services.publishParam?.(`group${gi + 1}_on`, on, { throttle: false });
    }
  }
  function drawGroups(): void {
    groupsWrap.innerHTML = '';
    state.groups.forEach((g, gi) => {
      const big = el('button', { class: 'ic-group-talk' });
      big.innerHTML = `${g.name}<small>TALK TO ALL · ${g.members.length}</small>`;
      const mem = el('div', { class: 'ic-group-members' });
      g.members.forEach((idx) => {
        mem.appendChild(el('span', { class: 'ic-chip' }, [keys[idx] ?? '']));
      });
      const x = el('div', { class: 'ic-group-x', title: 'Remove group' }, ['✕']);
      const row = el('div', { class: 'ic-group' + (g.on ? ' on' : '') }, [big, mem, x]);
      big.addEventListener('click', () => {
        setGroupOn(g, !g.on, true);
        row.classList.toggle('on', g.on);
      });
      x.addEventListener('click', () => {
        if (g.on) setGroupOn(g, false, true);
        state.groups.splice(gi, 1);
        drawGroups();
      });
      groupsWrap.appendChild(row);
    });
  }

  // Random "incoming" listen flicker so the panel feels live.
  ctx.dispose.interval(() => {
    if (!keyEls.length) return;
    keyEls.forEach((k) => k.classList.remove('listen'));
    const pick = keyEls[Math.floor(Math.random() * keyEls.length)];
    if (pick && Math.random() > 0.3) pick.classList.add('listen');
  }, 1400);

  // ---- sub-cards: IFB / beltpacks / matrix ----
  const sub = el('div', { class: 'ic-sub' });
  sub.innerHTML = `
            <div class="ic-card"><p class="ed-h">IFB — INTERRUPTIBLE FOLDBACK</p>
                <div class="ic-row"><span>TALENT 1 EARPIECE</span><span class="ic-pill on">PROGRAM</span></div>
                <div class="ic-row"><span>TALENT 2 EARPIECE</span><span class="ic-pill">PROGRAM</span></div>
                <div class="ic-row"><span>STAGE MANAGER</span><span class="ic-pill">PROGRAM</span></div></div>
            <div class="ic-card"><p class="ed-h">BELTPACKS</p>
                <div class="ic-row"><span>CAM 1 · PARTY-LINE A</span><span class="ic-pill on">ONLINE</span></div>
                <div class="ic-row"><span>CAM 2 · PARTY-LINE A</span><span class="ic-pill on">ONLINE</span></div>
                <div class="ic-row"><span>FLOOR · PARTY-LINE B</span><span class="ic-pill on">ONLINE</span></div></div>
            <div class="ic-card"><p class="ed-h">MATRIX</p>
                <div class="ic-row"><span>TALLY-LINKED DUCKING</span><span class="ic-pill on">ENABLED</span></div>
                <div class="ic-row"><span>PRIVATE LINE — DIR↔FLOOR</span><span class="ic-pill on">OPEN</span></div>
                <div class="ic-row"><span>ROUTER</span><span class="ic-pill on">ONLINE</span></div></div>`;
  sub.querySelectorAll<HTMLElement>('.ic-pill').forEach((p) => p.addEventListener('click', () => p.classList.toggle('on')));
  host.appendChild(sub);
}

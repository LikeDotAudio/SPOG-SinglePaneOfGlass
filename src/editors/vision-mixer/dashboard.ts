// src/editors/vision-mixer/dashboard — the free-form module canvas.
//
// The switcher's panels ("modules") float on an absolutely-positioned dashboard
// the operator can show/hide, drag and resize; the arrangement persists per twist
// (plan §10). This owns the ScreenLayout model, layout persistence, applyLayout,
// and the drag/resize observer, exposing them on a `Dashboard` object that the
// layout drawer drives. Extracted from the render closure.

import { el } from '../../ui/dom.js';

export interface ScreenLayout {
  order: string[];
  hidden: string[];
  sizes?: Record<string, { width: string; height: string }>;
  positions?: Record<string, { x: number; y: number }>;
}

export interface Dashboard {
  el: HTMLElement;
  modules: Record<string, HTMLElement>;
  layout: ScreenLayout;
  userPresets: Record<string, ScreenLayout>;
  locked: boolean;
  jsonView: HTMLTextAreaElement | undefined;
  applyLayout: () => void;
  layoutKey: string;
  presetsKey: string;
}

/** Build the dashboard canvas + its layout engine over the switcher's modules. */
export function createDashboard(twistName: string, modules: Record<string, HTMLElement>): Dashboard {
  const LAYOUT_KEY = `twist.vm.layout.${twistName}`;
  const PRESETS_KEY = `twist.vm.layout_presets`;

  const initPositions: Record<string, {x:number, y:number}> = {
    pgm: {x: 16, y: 16}, pvw: {x: 350, y: 16}, transitions: {x: 680, y: 16}, keyers: {x: 1000, y: 16},
    buses: {x: 16, y: 350}, macros: {x: 680, y: 220}, dsks: {x: 1000, y: 220},
    scenes: {x: 680, y: 400}, me: {x: 1000, y: 400}, aux: {x: 1000, y: 500}, dve: {x: 16, y: 550}
  };

  let currentLayout: ScreenLayout = {
    order: ['pgm', 'buses', 'pvw', 'transitions', 'keyers', 'macros', 'scenes', 'me', 'dsks', 'aux', 'tbar', 'dve'],
    hidden: [],
    sizes: {
      pgm: { width: '300px', height: '300px' },
      pvw: { width: '300px', height: '300px' },
      tbar: { width: '159px', height: '319px' },
      dsks: { width: '756px', height: '149px' },
      aux: { width: '206px', height: '208px' }
    },
    positions: {
      keyers: { x: 678, y: 139 },
      dsks: { x: 672, y: 224 },
      tbar: { x: 1313, y: 371 },
      dve: { x: 1490, y: 375 },
      aux: { x: 1592, y: 158 },
      macros: { x: 13, y: 612 },
      scenes: { x: 298, y: 606 },
      me: { x: 614, y: 613 }
    }
  };

  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) currentLayout.order = parsed;
      else if (parsed && parsed.order) currentLayout = parsed;
    }
  } catch {}

  let userLayoutPresets: Record<string, ScreenLayout> = {};
  try {
    const p = localStorage.getItem(PRESETS_KEY);
    if (p) userLayoutPresets = JSON.parse(p);
  } catch {}

  const dashboard = el('div', { class: 'vm-dashboard tips-disabled', style: 'position: relative; flex: 1; overflow: auto; min-height: 800px;' });

  const d: Dashboard = {
    el: dashboard,
    modules,
    layout: currentLayout,
    userPresets: userLayoutPresets,
    locked: true,
    jsonView: undefined,
    applyLayout,
    layoutKey: LAYOUT_KEY,
    presetsKey: PRESETS_KEY,
  };

  function applyLayout() {
    dashboard.replaceChildren();
    Object.keys(modules).forEach(k => {
      if (!d.layout.order.includes(k)) d.layout.order.push(k);
    });

    d.layout.order.forEach((id, index) => {
      const mod = modules[id];
      if (mod) {
        mod.style.display = d.layout.hidden.includes(id) ? 'none' : 'flex';
        mod.style.position = 'absolute';
        mod.style.zIndex = (index + 10).toString();
        mod.style.margin = '0';

        const pos = d.layout.positions?.[id] || initPositions[id] || {x: 0, y: 0};
        mod.style.left = `${pos.x}px`;
        mod.style.top = `${pos.y}px`;

        if (d.layout.sizes && d.layout.sizes[id]) {
          mod.style.width = d.layout.sizes[id].width || '';
          mod.style.height = d.layout.sizes[id].height || '';
        }
        mod.style.resize = 'both';
        mod.style.overflow = 'auto';
        dashboard.appendChild(mod);
      }
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(d.layout));
    if (d.jsonView) d.jsonView.value = JSON.stringify(d.layout, null, 2);
  }

  let draggedId: string | null = null;
  let resizeTimeout: ReturnType<typeof setTimeout>;

  const styleObserver = new MutationObserver((mutations) => {
    let changed = false;
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        const tgt = m.target as HTMLElement;
        const id = tgt.dataset.id;
        if (id) {
          if (!d.layout.sizes) d.layout.sizes = {};
          d.layout.sizes[id] = { width: tgt.style.width, height: tgt.style.height };
          changed = true;
        }
      }
    });
    if (changed) {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(d.layout));
      }, 500);
    }
  });

  let activeDrag: { id: string; startX: number; startY: number; initialX: number; initialY: number } | null = null;

  Object.entries(modules).forEach(([id, mod]) => {
    mod.dataset.id = id;
    styleObserver.observe(mod, { attributes: true, attributeFilter: ['style'] });

    mod.addEventListener('pointerdown', (e) => {
      // ONLY ALLOW DRAG/DROP WHEN LAYOUT IS UNLOCKED!
      if (d.locked) return;

      const tgt = e.target as HTMLElement;
      if (['BUTTON', 'SELECT', 'INPUT'].includes(tgt.tagName) || tgt.closest('button') || tgt.closest('select') || tgt.closest('input')) return;

      const rect = mod.getBoundingClientRect();
      const isResize = (e.clientX > rect.right - 24) && (e.clientY > rect.bottom - 24);
      if (isResize) return;

      const pos = d.layout.positions?.[id] || initPositions[id] || {x: 0, y: 0};
      activeDrag = {
        id,
        startX: e.pageX,
        startY: e.pageY,
        initialX: pos.x,
        initialY: pos.y
      };

      const idx = d.layout.order.indexOf(id);
      if (idx >= 0) {
        d.layout.order.splice(idx, 1);
        d.layout.order.push(id);
        applyLayout();
      }
      mod.setPointerCapture(e.pointerId);
    });

    mod.addEventListener('pointermove', (e) => {
      if (!activeDrag || activeDrag.id !== id) return;
      const dx = e.pageX - activeDrag.startX;
      const dy = e.pageY - activeDrag.startY;

      if (!d.layout.positions) d.layout.positions = {};
      d.layout.positions[id] = {
        x: activeDrag.initialX + dx,
        y: activeDrag.initialY + dy
      };
      mod.style.left = `${d.layout.positions[id].x}px`;
      mod.style.top = `${d.layout.positions[id].y}px`;
    });

    mod.addEventListener('pointerup', (e) => {
      if (activeDrag && activeDrag.id === id) {
        activeDrag = null;
        mod.releasePointerCapture(e.pointerId);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(d.layout));
        if (d.jsonView) d.jsonView.value = JSON.stringify(d.layout, null, 2);
      }
    });
  });

  applyLayout();

  return d;
}

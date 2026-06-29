// js/unroute.js — drag a routed source OUT of a destination, back onto the
// SOURCES panel, to remove (unroute) it. Works for an individual placed feed or
// a whole dropped group. The Captain's Log observes the drop-zone change, so the
// removal is narrated automatically.
import { updateTwistVisuals } from './visuals.js';

(function () {
    'use strict';
    let dragged = null;   // the placed feed/group being dragged out

    // A signal-node that lives inside a destination's drop-zone (not the sources).
    document.addEventListener('dragstart', (e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement) || !el.classList.contains('signal-node')) return;
        if (!el.closest('.drop-zone')) return;        // only placed (routed) feeds/groups
        dragged = el;
        try {
            e.dataTransfer.setData('source-type', 'placed');
            e.dataTransfer.setData('text/plain', el.id || '');
            e.dataTransfer.effectAllowed = 'move';
        } catch (_) {}
    }, true);
    document.addEventListener('dragend', () => { dragged = null; });

    function unroute(el) {
        const twist = el.closest('.twist-container');
        const kids = el.closest('.dropped-group-children');
        el.remove();
        if (kids && !kids.querySelector('.signal-node')) {
            const g = kids.closest('.dropped-group'); if (g) g.remove();
        }
        if (twist) try { updateTwistVisuals(twist); } catch (_) {}
    }

    function wire() {
        const panel = document.querySelector('.ingress-panel');
        if (!panel || panel.dataset.unroute) return;
        panel.dataset.unroute = '1';
        panel.addEventListener('dragover', (e) => {
            if (dragged) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
        });
        panel.addEventListener('drop', (e) => {
            if (!dragged) return;          // ignore normal source drags
            e.preventDefault();
            unroute(dragged);
            dragged = null;
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
})();

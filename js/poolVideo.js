// Shift a #rrggbb colour's lightness by amt (-100..100) for subtle per-node variation.
function shadeColor(hex, amt) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!m) return hex;
    const num = parseInt(m[1], 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    const f = amt / 100;
    const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (f < 0 ? c : 255 - c) * f)));
    return '#' + ((adj(r) << 16) | (adj(g) << 8) | adj(b)).toString(16).padStart(6, '0');
}

function styleVideoNode(node, color) {
    node.style.borderColor = color;
    node.style.color = color;
    node.style.boxShadow = `0 0 5px ${color}55`;
}

function populateVideoPool(poolId, prefix, count, extraClass, color) {
    const pool = document.getElementById(poolId);
    if (!pool) return;
    pool.innerHTML = '';
    const poolColor = color || '#CC99CC';
    for (let i = 1; i <= count; i++) {
        const id = prefix + i.toString().padStart(2, '0');
        const node = document.createElement('div');
        node.className = `signal-node video multiplex ${extraClass}`;
        node.id = 'pool-' + id;
        node.draggable = true;
        node.innerHTML = `
            <div class="multiplex-header">${id}</div>
            <div class="multiplex-children" style="display: none;">
                <div class="signal-node video ${extraClass} sub-stream" draggable="true" id="pool-${id}-V">${id}-V</div>
                <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A1">${id}-A1</div>
                <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A2">${id}-A2</div>
                <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A3">${id}-A3</div>
                <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A4">${id}-A4</div>
            </div>
        `;
        // Colour each source by its pool (e.g. Studio 3 = yellow), with a subtle
        // per-node border shade so individual sources stay distinguishable.
        styleVideoNode(node, poolColor);
        node.style.borderColor = shadeColor(poolColor, ((i % 4) * 14) - 21);
        const vSub = node.querySelector(`#pool-${id}-V`);
        if (vSub) styleVideoNode(vSub, poolColor);
        pool.appendChild(node);
    }
}

function renderVideoPool(data, container) {
    const group = document.createElement('div');
    group.className = 'input-group';
    group.innerHTML = `
        <div class="foldable-header" style="--lcars-color: ${data.color || 'var(--lcars-color)'}; font-size: 11px; margin-bottom: 8px;" onclick="togglePool(this)">
            <span>${data.name}</span>
            <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
        </div>
        <div class="input-grid-video pool-content" id="${data.id}" style="display: none;">
        </div>
    `;
    container.appendChild(group);
    populateVideoPool(data.id, data.prefix, data.count, data.extraClass, data.color);
}

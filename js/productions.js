// Render each production as a draggable source so its program output (video + audio)
// can be fed into the encoders' destination twists.
function renderProductionInputs(programs, container) {
    if (!container) return;
    const group = document.createElement('div');
    group.className = 'input-group';

    let html = `
        <div class="foldable-header" style="--lcars-color: #7CFC00; font-size: 11px; margin-bottom: 8px; color: #7CFC00;" onclick="togglePool(this)">
            <span>PROGRAM OUTPUTS</span>
            <span class="fold-icon" style="display: inline-block; transition: transform 0.2s;">▼</span>
        </div>
        <div class="input-grid-video pool-content">
    `;

    programs.forEach(pgm => {
        const color = pgm.color || '#7CFC00';
        html += `
            <div class="signal-node video multiplex prod-source" id="prodsrc-${pgm.id}" draggable="true" style="border-color: ${color}; color: ${color};">
                <div class="multiplex-header">${pgm.name}</div>
                <div class="multiplex-children" style="display: none;">
                    <div class="signal-node video video-main sub-stream" draggable="true" id="prodsrc-${pgm.id}-V">${pgm.name} V</div>
                    <div class="signal-node audio audio-studio sub-stream" draggable="true" id="prodsrc-${pgm.id}-A1">${pgm.name} A1</div>
                    <div class="signal-node audio audio-studio sub-stream" draggable="true" id="prodsrc-${pgm.id}-A2">${pgm.name} A2</div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    group.innerHTML = html;
    container.appendChild(group);
}

function renderPrograms(programs) {
    const twists = ['Processing', 'Recording', 'Switcher', 'Audio Mixer', 'Intercom'];
    
    programs.forEach(pgm => {
        const pgmTwists = pgm.twists || ['Processing', 'Recording', 'Switcher', 'Audio Mixer', 'Intercom'];
        const container = document.getElementById('tab-' + pgm.id);
        if (!container) return;
        
        let html = `
            <div class="program-row" style="--prod-color: ${pgm.color || '#ffaa00'}; position: relative; overflow: hidden; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px; height: 100%;">
                <div style="font-size: 16px; font-weight: bold; color: ${pgm.color}; margin-bottom: 20px; letter-spacing: 2px;">${pgm.name}</div>
                <div style="display: flex; flex-direction: column; gap: 30px; padding-bottom: 15px; overflow-y: auto; align-items: flex-start;">
        `;
        
        pgmTwists.forEach(twistObj => {
            let twistName = twistObj;
            let twistConfig = '';
            let lcarsColor = pgm.color || '#ffaa00';
            
            if (typeof twistObj === 'object') {
                twistName = twistObj.name;
                twistConfig = `data-config='${JSON.stringify(twistObj).replace(/'/g, "&#39;")}'`;
                if (twistObj.accepts === 'video') lcarsColor = '#CC99CC';
                if (twistObj.accepts === 'audio') lcarsColor = '#FF9C63';
            }

            html += `
                    <div class="twist-container" ${twistConfig} style="--lcars-color: ${lcarsColor}; flex: 0 0 auto; min-width: 200px;">
                        <div class="twist-title">${twistName}</div>
                        <div class="matrix-container" id="${pgm.id}-${twistName.replace(/\s+/g, '-').toLowerCase()}">
                            <div style="color: rgba(255,255,255,0.5); text-align: center; margin-top: 50px;">NO SWIMMERS ASSIGNED TO THIS GENE.</div>
                        </div>
                        <svg class="dna-helix" viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100px; display: block; margin-top: 10px;"></svg>
                    </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        container.innerHTML = html;
    });
    
    if (typeof initializeTwists === 'function') {
        initializeTwists();
    }
}

function renderPrograms(programs) {
    const twists = ['Processing', 'Recording', 'Switcher', 'Audio Mixer', 'Intercom'];
    
    programs.forEach(pgm => {
        const pgmTwists = pgm.twists || ['Processing', 'Recording', 'Switcher', 'Audio Mixer', 'Intercom'];
        const container = document.getElementById('tab-' + pgm.id);
        if (!container) return;
        
        let html = `
            <div class="program-row" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px; height: 100%;">
                <div style="font-size: 16px; font-weight: bold; color: ${pgm.color}; margin-bottom: 20px; letter-spacing: 2px;">${pgm.name}</div>
                <div style="display: flex; flex-direction: column; gap: 30px; padding-bottom: 15px; overflow-y: auto; align-items: flex-start;">
        `;
        
        pgmTwists.forEach(twistObj => {
            let twistName = twistObj;
            let twistConfig = '';
            if (typeof twistObj === 'object') {
                twistName = twistObj.name;
                twistConfig = `data-config='${JSON.stringify(twistObj).replace(/'/g, "&#39;")}'`;
            }

            html += `
                    <div class="twist-container" ${twistConfig} style="flex: 0 0 auto; min-width: 200px;">
                        <svg viewBox="0 0 80 100"></svg>
                        <div class="twist-title" style="color: ${pgm.color};">${twistName}</div>
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

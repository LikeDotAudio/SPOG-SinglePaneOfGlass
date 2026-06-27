async function initApp() {
    // Load Productions
    const prodFiles = ['Production 1.json', 'Production 2.json', 'Production 3.json', 'Production 4.json', 'Production 5.json'];
    const programs = [];
    for (let file of prodFiles) {
        const data = await fetchJSON('Productions/' + file);
        if (data) programs.push(data);
    }
    
    const tabsContainer = document.getElementById('production-tabs');
    const contentContainer = document.getElementById('production-content');
    TopBar.init(tabsContainer, contentContainer);

    const prodGroup = TopBar.addGroup('PRODUCTIONS', { color: '100,109,204' });
    programs.forEach((pgm, index) => {
        TopBar.addTab(pgm, { group: prodGroup, active: index === 0 });
    });
    
    renderPrograms(programs);

    // Expose productions as draggable inputs (so encoders can take program outputs)
    const productionsSuper = document.getElementById('productions-super-pool-content');
    if (typeof renderProductionInputs === 'function') {
        renderProductionInputs(programs, productionsSuper);
    }

    // Load Floors (between Productions and Master) — each with monitors, IEMs and foldback
    const floorFiles = ['Floor 1.json', 'Floor 2.json', 'Floor 3.json', 'Floor 4.json'];
    const floorPrograms = [];
    for (let file of floorFiles) {
        const data = await fetchJSON('Floors/' + file);
        if (data) floorPrograms.push(data);
    }
    const floorGroup = TopBar.addGroup('FLOORS', { color: '63,193,201', collapsed: true });
    floorPrograms.forEach((pgm) => {
        TopBar.addTab(pgm, { group: floorGroup, active: false });
    });
    renderPrograms(floorPrograms);

    // Load Video Pools
    const videoFiles = ['Studio 1.json', 'Studio 2.json', 'Studio 3.json', 'Studio 4.json', 'Remotes.json', 'Sats.json'];
    const videoSuper = document.getElementById('video-super-pool-content');
    for (let file of videoFiles) {
        try {
            const data = await fetchJSON('Video/' + file);
            if (data && typeof renderVideoPool === 'function') {
                renderVideoPool(data, videoSuper);
            }
        } catch (e) {
            console.error('Error loading video pool:', e);
        }
    }
    
    // Load Audio Pools
    const audioSuper = document.getElementById('audio-super-pool-content');
    for (let i = 1; i <= 10; i++) {
        try {
            const data = await fetchJSON(`Audio/Pool${i}.json`);
            if (data && typeof renderAudioPool === 'function') {
                const poolColor = AUDIO_POOL_COLORS[(i - 1) % AUDIO_POOL_COLORS.length];
                renderAudioPool(data, audioSuper, poolColor);
            }
        } catch (e) {
            console.error('Error loading audio pool:', e);
        }
    }

    // Load Masters
    const masterFiles = ['Encoder 1.json', 'Encoder 2.json', 'Encoder 4.json'];
    const masterPrograms = [];
    for (let file of masterFiles) {
        const data = await fetchJSON('Master/' + file);
        if (data) {
            data.color = '#ff3366';
            masterPrograms.push(data);
        }
    }
    const masterGroup = TopBar.addGroup('MASTER', { color: '255,51,102', collapsed: true });
    masterPrograms.forEach((pgm) => {
        TopBar.addTab(pgm, { group: masterGroup, active: false });
    });
    renderPrograms(masterPrograms);

    initializeDraggables();
    initializeTwists();
}

window.addEventListener('DOMContentLoaded', initApp);

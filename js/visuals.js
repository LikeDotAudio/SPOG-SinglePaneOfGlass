function getDNAHtml(cycles, width, colors) {
    let svgContent = '';
    const amplitude = 35;
    const freq = (cycles * 2 * Math.PI) / (width - 20);
    
    const numColors = colors.length;
    let gradientStops = '';
    colors.forEach((c, i) => {
        const percent = (i / (numColors > 1 ? numColors - 1 : 1)) * 100;
        gradientStops += `<stop offset="${percent}%" stop-color="${c}" />`;
    });
    const gradientId = 'dna-grad-' + Math.random().toString(36).substr(2,9);
    
    svgContent += `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${gradientStops}</linearGradient></defs>`;
    
    // Rungs (base pairs)
    const numRungs = cycles * 8;
    for (let i = 0; i <= numRungs; i++) {
        const x = 10 + (i / numRungs) * (width - 20);
        const y1 = 50 + amplitude * Math.sin(freq * (x - 10));
        const y2 = 50 + amplitude * Math.sin(freq * (x - 10) + Math.PI);
        
        const opacity = 0.3 + (Math.sin(freq * (x - 10)) + 1) * 0.2;
        const rungColor = colors[i % numColors];
        svgContent += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${rungColor}" stroke-opacity="${opacity}" stroke-width="2.5" />`;
        svgContent += `<circle cx="${x}" cy="${y1}" r="2" fill="${rungColor}" opacity="0.6" />`;
        svgContent += `<circle cx="${x}" cy="${y2}" r="2" fill="${rungColor}" opacity="0.6" />`;
    }
    
    // Strands (backbones)
    let d1 = `M 10,50 `;
    let d2 = `M 10,50 `;
    
    const steps = cycles * 20;
    for (let i = 1; i <= steps; i++) {
        const x = 10 + (i / steps) * (width - 20);
        const y1 = 50 + amplitude * Math.sin(freq * (x - 10));
        const y2 = 50 + amplitude * Math.sin(freq * (x - 10) + Math.PI);
        d1 += `L ${x},${y1} `;
        d2 += `L ${x},${y2} `;
    }
    
    svgContent += `<path class="strand strand-1-glow" d="${d1}" fill="none" stroke="url(#${gradientId})" stroke-width="8" opacity="0.5" style="filter: blur(3px);" />`;
    svgContent += `<path class="strand strand-1" d="${d1}" fill="none" stroke="url(#${gradientId})" stroke-width="4" />`;
    svgContent += `<path class="strand strand-1-core" d="${d1}" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity="0.8" />`;
    
    svgContent += `<path class="strand strand-2-glow" d="${d2}" fill="none" stroke="url(#${gradientId})" stroke-width="8" opacity="0.3" style="filter: blur(3px);" />`;
    svgContent += `<path class="strand strand-2" d="${d2}" fill="none" stroke="url(#${gradientId})" stroke-width="4" stroke-opacity="0.8" />`;
    svgContent += `<path class="strand strand-2-core" d="${d2}" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity="0.6" />`;
    
    return svgContent;
}

function updateTwistVisuals(twist) {
    const dropZone = twist.querySelector('.drop-zone');
    if (!dropZone) return;
    
    const swimmers = dropZone.querySelectorAll('.signal-node');
    const totalCount = swimmers.length;
    let videoCount = 0;
    let audioCount = 0;
    
    swimmers.forEach(s => {
        if (s.classList.contains('video')) videoCount++;
        if (s.classList.contains('audio')) audioCount++;
    });
    
    let statsEl = twist.querySelector('.twist-stats');
    if (!statsEl) {
        statsEl = document.createElement('div');
        statsEl.className = 'twist-stats';
        statsEl.style.fontSize = '10px';
        statsEl.style.color = 'rgba(0, 255, 255, 0.8)';
        statsEl.style.marginTop = '5px';
        statsEl.style.marginBottom = '5px';
        statsEl.style.letterSpacing = '1px';
        twist.querySelector('.twist-title').after(statsEl);
    }
    statsEl.innerText = `SOURCES: ${totalCount} [V:${videoCount} | A:${audioCount}]`;
    
    const cycles = Math.max(1, totalCount);
    const cycleWidth = 60;
    const width = 20 + cycles * cycleWidth;
    
    twist.style.minWidth = `${Math.max(200, width + 40)}px`;
    
    const svg = twist.querySelector('svg');
    if (svg) {
        svg.setAttribute('viewBox', `0 0 ${width} 100`);
        const title = twist.querySelector('.twist-title');
        const defaultColor = title ? title.style.color : 'var(--magenta)';
        
        let sourceColors = [];
        swimmers.forEach(s => {
            const compColor = window.getComputedStyle(s).color;
            sourceColors.push(compColor);
        });
        
        if (totalCount === 0) {
            svg.innerHTML = '';
        } else {
            svg.innerHTML = getDNAHtml(cycles, width, sourceColors);
        }
    }
}

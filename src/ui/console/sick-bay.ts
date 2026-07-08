// src/ui/console/sick-bay.ts — the SICK BAY destination for faulted systems.
import { Footer } from './footer.js';
import { listDirectory, fetchJSON } from '../../platform/discovery.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import type { Production, SourceLeaf } from '../../model/index.js';
import { monoEmoji, faultTag, slugId } from '../sources/format.js';

export async function initSickBay(): Promise<void> {
  const groupColor = '#ff3333'; // RED ALERT color
  const group = Footer.addGroup('SICK BAY', { color: groupColor, collapsed: true });
  if (!group) return;

  Footer.addTab({ id: 'sick-bay-monitor', name: 'MONITOR' }, {
    group,
    color: groupColor,
    onActivate: async () => {
      const pane = document.getElementById('tab-sick-bay-monitor');
      if (!pane) return;
      pane.innerHTML = `<div style="padding: 24px; color: ${groupColor};">Scanning all systems...</div>`;

      const faults: { name: string; type: string; status: string; path: string; tip?: any; id: string; isDest: boolean }[] = [];

      async function walkSources(baseUrl: string) {
        const { dirs, files } = await listDirectory(baseUrl);
        for (const f of files) {
          const data = await fetchJSON<SourceLeaf>(baseUrl + f.href);
          if (data && isFaultStatus(data.status)) {
            const id = data.id || slugId(data.name);
            faults.push({ name: data.name, type: data.type || 'Source', status: data.status!, path: baseUrl + f.href, tip: data.tip, id, isDest: false });
          }
        }
        for (const d of dirs) await walkSources(baseUrl + d.href);
      }

      async function walkDestinations(baseUrl: string) {
        const { dirs, files } = await listDirectory(baseUrl);
        for (const f of files) {
          const data = await fetchJSON<Production>(baseUrl + f.href);
          if (data && isFaultStatus(data.status)) {
            const ns = baseUrl.replace(/[^a-zA-Z0-9]/g, '-');
            const fileName = decodeURIComponent(f.href).replace(/\.json$/i, '');
            const id = ns + '--' + fileName.replace(/[^a-zA-Z0-9]+/g, '-');
            faults.push({ name: data.name, type: 'Destination', status: data.status!, path: baseUrl + f.href, tip: data.tip, id, isDest: true });
          }
        }
        for (const d of dirs) await walkDestinations(baseUrl + d.href);
      }

      await Promise.all([
        walkSources('Routes/People/'), // Walk people first
        walkSources('Routes/Sources/'),
        walkDestinations('Routes/Destinations/')
      ]);

      if (faults.length === 0) {
        pane.innerHTML = `
          <div style="padding: 24px; color: #888;">
            <h2 style="color: ${groupColor}; margin-top: 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.5em;">⚕</span> SICK BAY
            </h2>
            <div style="font-size: 1.2em; margin-top: 16px;">All systems operational. No faults detected.</div>
          </div>
        `;
        return;
      }

      pane.innerHTML = `
        <div style="padding: 24px;">
          <h2 style="color: ${groupColor}; margin-top: 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5em;">⚕</span> SICK BAY
          </h2>
          <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px;">
            ${faults.map(f => {
              const tipString = typeof f.tip === 'string' ? f.tip : (f.tip?.lead || '');
              const clickScript = f.isDest 
                ? `const el = document.querySelector('.lcars-tab[data-tab-id=\\'${f.id}\\']'); if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.click(); }`
                : `const el = document.getElementById('pool-${f.id}'); if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.click(); }`;
              return `
                <div style="flex: 1 1 300px; max-width: 400px; background: rgba(255,0,0,0.1); border: 2px solid ${groupColor}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 0 10px rgba(255,51,51,0.2); cursor: pointer;" onclick="${clickScript}">
                  <div style="font-weight: bold; font-size: 1.2em; color: ${groupColor}; display: flex; justify-content: space-between; align-items: flex-start;">
                    <span>${monoEmoji(f.name)}${f.name}</span>
                    ${faultTag(f.status)}
                  </div>
                  <div style="color: #ccc; font-size: 0.9em; text-transform: uppercase;">${f.type}</div>
                  <div style="color: #999; font-size: 0.8em; word-break: break-all;">${f.path}</div>
                  <div style="background: #000; border: 2px solid #555; border-radius: 6px; padding: 12px; text-align: center; margin-top: 8px;">
                    <div style="color: ${groupColor}; font-family: monospace; font-size: 1.2em; font-weight: bold; letter-spacing: 2px;">
                      ${f.status}
                    </div>
                    <div style="color: #aaa; font-family: monospace; font-size: 0.85em; margin-top: 4px;">
                      ${tipString || 'NO SIGNAL DATA'}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  });
}

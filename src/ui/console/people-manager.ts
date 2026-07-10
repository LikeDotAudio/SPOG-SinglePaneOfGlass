// src/ui/console/people-manager.ts — the TALENT MANAGER overlay.
// Displays categories of talent and the talent themselves as a guide to the crew.
import { addStyles } from '../dom.js';
import { listDirectory, fetchJSON, type Entry } from '../../platform/discovery.js';
import type { SourceLeaf } from '../../model/index.js';
import { stripOrder } from '../sources/format.js';

const PM_CSS = `
.pm-ov{position:fixed;inset:0;z-index:3100;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 30%,rgba(13,23,48,.92),rgba(3,6,15,.96));font-family:Arial,Helvetica,sans-serif;}
.pm-ov.open{display:flex;}
.pm-box{width:min(960px,94vw);max-height:90vh;overflow:auto;background:#0a1326;border:1px solid #1d2942;border-radius:16px;padding:26px;}
.pm-box h2{margin:0 0 2px;color:#fff;font-size:22px;letter-spacing:2px;}
.pm-box p{margin:0 0 20px;color:#7e93b5;font-size:12px;letter-spacing:1px;}
.pm-cat{margin-top:20px;border:1px solid #2c3e5e;border-radius:12px;background:#0c1730;padding:14px;}
.pm-cat h3{margin:0 0 10px;color:#9fd6ff;font-size:16px;letter-spacing:1px;border-bottom:1px solid #1d2942;padding-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
.pm-add-btn{background:#1d2942;border:none;color:#9fd6ff;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;}
.pm-add-btn:hover{background:#2c3e5e;}
.pm-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;}
.pm-person{display:flex;align-items:center;gap:10px;background:#13233c;padding:10px;border-radius:8px;border:1px solid #1d2942;position:relative;}
.pm-person:hover .pm-edit-btn{display:block;}
.pm-edit-btn{display:none;position:absolute;right:8px;top:8px;background:none;border:none;color:#6b82a3;cursor:pointer;font-size:12px;}
.pm-edit-btn:hover{color:#fff;}
.pm-person-icon{width:32px;height:32px;border-radius:50%;background:#1d2942;display:flex;align-items:center;justify-content:center;color:#cfe6ff;font-size:14px;font-weight:bold;}
.pm-person-details{display:flex;flex-direction:column;}
.pm-person-name{color:#fff;font-size:13px;font-weight:bold;}
.pm-person-role{color:#6b82a3;font-size:11px;}
.pm-loading{color:#fff;font-style:italic;}
`;

import { putDraft, getDraft } from '../../platform/routes-store.js';

let ov: HTMLElement | null = null;

function ensure(): HTMLElement {
  addStyles('pm-styles', PM_CSS);
  if (ov) return ov;
  ov = document.createElement('div');
  ov.className = 'pm-ov';
  ov.innerHTML = `<div class="pm-box"><h2>CREW & TALENT MANAGER</h2><p>GUIDE TO ON-AIR TALENT AND CREW</p><div class="pm-list"><div class="pm-loading">Loading talent data...</div></div></div>`;
  ov.addEventListener('click', (e) => { if (e.target === ov) ov?.classList.remove('open'); });
  document.body.appendChild(ov);
  return ov;
}

async function build(root: HTMLElement): Promise<void> {
  const list = root.querySelector<HTMLElement>('.pm-list');
  if (!list) return;
  
  const { dirs } = await listDirectory('Routes/Talent/');
  
  list.innerHTML = '';
  
  for (const cat of dirs) {
    const catName = stripOrder(cat.name);
    const catDiv = document.createElement('div');
    catDiv.className = 'pm-cat';
    
    const h3 = document.createElement('h3');
    h3.innerHTML = `<span>${catName.toUpperCase()}</span><button class="pm-add-btn">+ ADD</button>`;
    catDiv.appendChild(h3);
    
    const peopleGrid = document.createElement('div');
    peopleGrid.className = 'pm-people';
    catDiv.appendChild(peopleGrid);
    list.appendChild(catDiv);
    
    const { files } = await listDirectory(`Routes/Talent/${cat.href}`);
    const rawDatas = await Promise.all(files.map(async f => {
      const data = await fetchJSON<any>(`Routes/Talent/${cat.href}${f.href}`);
      return data ? { file: f, data } : null;
    }));
    const validDatas = rawDatas.filter(d => Boolean(d)) as Array<{file: any, data: any}>;
    
    h3.querySelector('button')?.addEventListener('click', async () => {
      const name = prompt(`Enter name for new ${catName}:`);
      if (!name) return;
      const title = prompt(`Enter title for ${name}:`, catName);
      const safeName = name.replace(/[^a-zA-Z0-9 ]/g, '');
      const filename = `999_${safeName}.json`;
      const url = `Routes/Talent/${cat.href}${filename}`;
      
      const tmpl = validDatas[0]?.data || { source: { audio: [], video: [] }, kit: { twists: [] } };
      const newPerson = {
        ...tmpl,
        id: safeName.toLowerCase().replace(/\\s+/g, '-'),
        name: name.toUpperCase(),
        title: (title || catName).toUpperCase(),
        role: catName.toLowerCase(),
      };
      
      putDraft(url, newPerson);
      
      const idxUrl = `Routes/Talent/${cat.href}index.json`;
      let manifest = getDraft<string[]>(idxUrl) || await fetchJSON<string[]>(idxUrl) || [];
      if (Array.isArray(manifest) && !manifest.includes(filename)) {
        manifest.push(filename);
        putDraft(idxUrl, manifest);
      }
      
      void build(root); // Refresh
    });
    
    validDatas.forEach(({ file, data: d }) => {
      const pDiv = document.createElement('div');
      pDiv.className = 'pm-person';
      const initials = (d.name || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      const titleStr = d.title || catName;
      
      pDiv.innerHTML = `
        <div class="pm-person-icon">${initials}</div>
        <div class="pm-person-details">
          <span class="pm-person-name">${d.name}</span>
          <span class="pm-person-role">${titleStr}</span>
        </div>
        <button class="pm-edit-btn" title="Edit Title">✎</button>
      `;
      
      pDiv.querySelector('.pm-edit-btn')?.addEventListener('click', () => {
        const newTitle = prompt(`Enter new title for ${d.name}:`, titleStr);
        if (!newTitle) return;
        d.title = newTitle.toUpperCase();
        putDraft(`Routes/Talent/${cat.href}${file.href}`, d);
        pDiv.querySelector('.pm-person-role')!.textContent = d.title;
      });
      
      peopleGrid.appendChild(pDiv);
    });
  }
}

export function showPeopleManager(): void {
  const root = ensure();
  root.classList.add('open');
  void build(root);
}

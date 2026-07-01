// js/dialog.js — a tiny promise-based LCARS confirm dialog.
// confirmDialog(message, yesText, noText) → Promise<boolean> (true = yes).
const STYLE_ID = 'lcars-dialog-styles';

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    .dlg-overlay{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;
        background:rgba(2,5,12,.7);font-family:Arial,Helvetica,sans-serif;}
    .dlg-box{width:min(420px,92vw);background:#0a1020;border:2px solid #FF9C63;border-radius:0 18px 18px 0;
        border-left:14px solid #FF9C63;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.6);}
    .dlg-msg{padding:22px 22px 8px;color:#e0f0ff;font-size:15px;line-height:1.5;letter-spacing:.5px;}
    .dlg-actions{display:flex;gap:10px;justify-content:flex-end;padding:14px 18px 18px;}
    .dlg-actions button{border:none;border-radius:16px;font-weight:900;letter-spacing:1px;font-size:12px;
        text-transform:uppercase;padding:10px 20px;cursor:pointer;}
    .dlg-yes{background:#FF9C63;color:#000;} .dlg-no{background:#2a3550;color:#cfe0ff;}
    .dlg-actions button:hover{filter:brightness(1.12);}
    `;
    document.head.appendChild(s);
}

export function confirmDialog(message, yesText = 'OK', noText = 'Cancel') {
    return new Promise(resolve => {
        injectStyles();
        const ov = document.createElement('div');
        ov.className = 'dlg-overlay';
        ov.innerHTML = `
            <div class="dlg-box" role="dialog">
                <div class="dlg-msg">${message}</div>
                <div class="dlg-actions">
                    <button class="dlg-no">${noText}</button>
                    <button class="dlg-yes">${yesText}</button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        const done = (v) => { ov.remove(); resolve(v); };
        ov.querySelector('.dlg-yes').addEventListener('click', () => done(true));
        ov.querySelector('.dlg-no').addEventListener('click', () => done(false));
        ov.addEventListener('click', (e) => { if (e.target === ov) done(false); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { document.removeEventListener('keydown', esc); done(false); }
        });
    });
}

export const SCHED_CSS = `
.sc-ov{position:fixed;inset:0;z-index:3100;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 30%,rgba(13,23,48,.92),rgba(3,6,15,.96));font-family:Arial,Helvetica,sans-serif;}
.sc-ov.open{display:flex;}
.sc-box{width:min(960px,94vw);max-height:90vh;overflow:auto;background:#0a1326;border:1px solid #1d2942;border-radius:16px;padding:26px;}
.sc-box h2{margin:0 0 2px;color:#fff;font-size:22px;letter-spacing:2px;display:flex;justify-content:space-between;align-items:center;}
.sc-box h2 button{font-size:12px;padding:4px 8px;background:#1d2942;color:#fff;border:none;border-radius:4px;cursor:pointer;}
.sc-box p{margin:0 0 20px;color:#7e93b5;font-size:12px;letter-spacing:1px;}
.sc-slot{display:grid;grid-template-columns:120px 1fr;gap:14px;border-radius:12px;border:1px solid #2c3e5e;background:#0c1730;padding:14px;margin-bottom:12px;position:relative;}
.sc-slot.live{border-color:#ff3b3b;box-shadow:0 0 16px rgba(255,59,59,.35);}
.sc-time{font:bold 15px 'Courier New',monospace;color:#6FC8F0;letter-spacing:1px;}
.sc-time .badge{display:inline-block;margin-top:8px;font:900 9px sans-serif;letter-spacing:1px;border-radius:5px;padding:3px 7px;background:#1d2942;color:#9fb6cc;}
.sc-slot.live .sc-time .badge{background:#ff3b3b;color:#fff;}
.sc-show b{display:block;color:#fff;font-size:17px;letter-spacing:1px;}
.sc-room{color:#9fd6ff;font-size:12px;letter-spacing:1px;margin:3px 0 10px;}
.sc-crew{display:flex;flex-wrap:wrap;gap:6px;}
.sc-resources{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.sc-role{font:bold 10px sans-serif;letter-spacing:.5px;border-radius:6px;padding:5px 9px;background:#13233c;color:#cfe6ff;border:1px solid #2c3e5e;}
.sc-resource{font:bold 10px sans-serif;letter-spacing:.5px;border-radius:6px;padding:5px 9px;background:#1a0e28;color:#d8b4e2;border:1px solid #4a2d6b;}
.sc-legend{display:flex;gap:16px;margin:-8px 0 16px;font:bold 11px sans-serif;letter-spacing:1px;}
.sc-hint{color:#6b82a3;font-size:11px;letter-spacing:1px;margin-top:6px;}
.sc-edit-btn{position:absolute;top:14px;right:14px;background:#1d2942;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;}
.sc-edit-btn:hover{background:#2c3e5e;}
.sc-editor{display:flex;flex-direction:column;gap:8px;width:100%;}
.sc-editor input{background:#0d1730;border:1px solid #2c3e5e;color:#fff;padding:6px;border-radius:4px;}
.sc-editor label{font-size:11px;color:#7e93b5;display:flex;flex-direction:column;gap:4px;}
.sc-editor-actions{display:flex;gap:8px;margin-top:8px;}
.sc-editor-actions button{padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}
.sc-editor-actions button.save{background:#e0b53a;color:#000;}
.sc-editor-actions button.cancel{background:#1d2942;color:#fff;}
.sc-new-btn{width:100%;padding:12px;background:#13233c;color:#cfe6ff;border:1px dashed #2c3e5e;border-radius:8px;cursor:pointer;margin-bottom:12px;font-weight:bold;}
.sc-new-btn:hover{background:#1d2942;}
`;

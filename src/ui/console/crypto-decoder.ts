import { el, addStyles } from '../dom.js';
import { debugDecodePayload } from '../../platform/mqtt/codec.js';

const CSS = `
.crypto-decoder-modal {
  position: fixed; top: 10%; left: 10%; width: 80%; height: 80%;
  background: #060e1a; border: 2px solid #24304e; border-radius: 12px;
  z-index: 9999; display: flex; flex-direction: column; color: #bcd3ee;
  font-family: 'Courier New', monospace; font-size: 11px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
}
.cd-header {
  padding: 12px; background: #16233d; border-bottom: 2px solid #24304e;
  display: flex; justify-content: space-between; align-items: center; border-radius: 10px 10px 0 0;
}
.cd-title { font-weight: bold; letter-spacing: 2px; color: #fff; }
.cd-close { cursor: pointer; color: #f4902c; font-weight: bold; font-size: 14px; padding: 0 10px; }
.cd-body { display: flex; flex: 1; min-height: 0; }
.cd-panel { flex: 1; display: flex; flex-direction: column; border-right: 2px solid #16233d; padding: 10px; }
.cd-panel:last-child { border-right: none; }
.cd-panel-title { font-weight: bold; margin-bottom: 8px; color: #3FC1C9; letter-spacing: 1px; }
.cd-log { flex: 1; overflow-y: auto; background: #02060d; padding: 8px; border-radius: 6px; }
.cd-log-entry { border-bottom: 1px solid #16233d; padding-bottom: 8px; margin-bottom: 8px; }
.cd-log-topic { color: #f4902c; font-weight: bold; margin-bottom: 4px; }
.cd-log-hex { color: #5a6a86; word-break: break-all; margin-bottom: 4px; font-size: 10px; }
.cd-log-json { color: #a4c953; white-space: pre-wrap; margin-bottom: 4px; }
.cd-controls { display: flex; gap: 10px; margin-bottom: 10px; }
.cd-controls button { background: #3FC1C9; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight: bold; }
.cd-controls button.active { background: #f4902c; color: #fff; }
.cd-textarea { width: 100%; height: 100px; background: #02060d; color: #fff; border: 1px solid #24304e; padding: 8px; font-family: inherit; border-radius: 6px; margin-bottom: 10px; resize: none; }
.cd-decode-btn { background: #3FC1C9; color: #000; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight: bold; margin-bottom: 10px; }
`;

let modal: HTMLElement | null = null;
let isSniffing = false;
let logContainer: HTMLElement | null = null;

export function toggleCryptoDecoder(): void {
  if (modal) {
    modal.remove();
    modal = null;
    isSniffing = false;
    return;
  }
  
  addStyles('crypto-decoder-css', CSS);
  
  modal = el('div', { class: 'crypto-decoder-modal' });
  const header = el('div', { class: 'cd-header' }, [
    el('div', { class: 'cd-title' }, ['MAGIC DECODER RING & PROTOBUF SNIFFER']),
    el('div', { class: 'cd-close' }, ['✕'])
  ]);
  
  const snifferPanel = el('div', { class: 'cd-panel' });
  const snifferTitle = el('div', { class: 'cd-panel-title' }, ['LIVE MQTT SNIFFER']);
  const snifferControls = el('div', { class: 'cd-controls' });
  const btnSniff = el('button', { class: 'cd-sniff-btn' }, ['START SNIFFING']);
  const btnClear = el('button', {}, ['CLEAR LOG']);
  snifferControls.append(btnSniff, btnClear);
  
  logContainer = el('div', { class: 'cd-log' });
  snifferPanel.append(snifferTitle, snifferControls, logContainer);
  
  btnSniff.onclick = () => {
    isSniffing = !isSniffing;
    btnSniff.textContent = isSniffing ? 'STOP SNIFFING' : 'START SNIFFING';
    btnSniff.classList.toggle('active', isSniffing);
  };
  btnClear.onclick = () => { if (logContainer) logContainer.innerHTML = ''; };
  
  const manualPanel = el('div', { class: 'cd-panel' });
  const manualTitle = el('div', { class: 'cd-panel-title' }, ['MANUAL HEX/B64 DECODER']);
  const textarea = el('textarea', { class: 'cd-textarea', placeholder: 'Paste Hex or Base64 string here...' });
  const btnDecode = el('button', { class: 'cd-decode-btn' }, ['DECODE PROTOBUF']);
  const resultLog = el('div', { class: 'cd-log' });
  manualPanel.append(manualTitle, textarea, btnDecode, resultLog);
  
  btnDecode.onclick = async () => {
    let str = (textarea as HTMLTextAreaElement).value.trim();
    let bytes: Uint8Array;
    try {
      if (/^[0-9a-fA-F]+$/.test(str)) {
        const match = str.match(/.{1,2}/g);
        bytes = new Uint8Array(match ? match.map(byte => parseInt(byte, 16)) : []);
      } else {
        const binString = atob(str);
        bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);
      }
      
      const res = await debugDecodePayload(bytes);
      resultLog.innerHTML = '';
      resultLog.append(
        el('div', { class: 'cd-log-topic' }, ['DECODED RESULT']),
        el('div', { class: 'cd-log-json' }, ['Proto AST: ' + JSON.stringify(res.rawProtoJSON, null, 2)]),
        el('div', { class: 'cd-log-json', style: 'color:#3FC1C9' }, ['App Payload: ' + JSON.stringify(res.decodedPayload, null, 2)]),
        res.error ? el('div', { style: 'color:red' }, [res.error]) : ''
      );
    } catch (e) {
      resultLog.innerHTML = '<div style="color:red">Invalid Hex/Base64 input.</div>';
    }
  };
  
  modal.append(header, el('div', { class: 'cd-body' }, [snifferPanel, manualPanel]));
  document.body.append(modal);
  
  (header.querySelector('.cd-close') as HTMLElement).onclick = toggleCryptoDecoder;
}

if (typeof window !== 'undefined') {
  window.addEventListener('mqtt-raw-message', (e: Event) => {
    if (!isSniffing || !logContainer) return;
    const evt = e as CustomEvent<{ topic: string, payload: Uint8Array }>;
    const hex = Array.from(evt.detail.payload, b => b.toString(16).padStart(2,'0')).join('');
    
    debugDecodePayload(evt.detail.payload).then(res => {
      const entry = el('div', { class: 'cd-log-entry' }, [
        el('div', { class: 'cd-log-topic' }, [evt.detail.topic]),
        el('div', { class: 'cd-log-hex' }, [hex]),
        el('div', { class: 'cd-log-json' }, ['Proto: ' + JSON.stringify(res.rawProtoJSON)]),
        el('div', { class: 'cd-log-json', style: 'color:#3FC1C9' }, ['Payload: ' + JSON.stringify(res.decodedPayload)])
      ]);
      logContainer!.prepend(entry);
      if (logContainer!.childNodes.length > 50) logContainer!.lastChild?.remove();
    });
  });
}

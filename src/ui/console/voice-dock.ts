import { addStyles, el } from '../dom.js';
import { launchDock } from './launch-dock.js';
import { getBus } from '../../platform/mqtt/index.js';

const CSS = `
.voice-launch{position:fixed;right:130px;bottom:76px;z-index:1000;background:#ff3366;color:#fff;border:none;border-radius:18px 6px 6px 18px;font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:8px 18px 8px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:inset 5px 0 0 #b31038;}
.voice-launch.listening { animation: pulse-mic 1.5s infinite; }
@keyframes pulse-mic { 0% { transform: scale(1); box-shadow:inset 5px 0 0 #b31038, 0 0 10px rgba(255,51,102,0.6); } 50% { transform: scale(1.05); box-shadow:inset 5px 0 0 #b31038, 0 0 20px rgba(255,51,102,0.9); } 100% { transform: scale(1); box-shadow:inset 5px 0 0 #b31038, 0 0 10px rgba(255,51,102,0.6); } }
.voice-panel{position:fixed;right:130px;bottom:120px;z-index:2400;width:min(400px,92vw);display:none;flex-direction:column;background:#0a0c12;border:1px solid #22303a;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#d6e6ef;}
.voice-panel.open{display:flex;}
.vd-head{display:flex;justify-content:space-between;padding:12px;background:#1a2333;border-bottom:1px solid #22303a;font-size:14px;}
.vd-x{background:none;border:none;color:#8fb0d0;cursor:pointer;font-size:18px;}
.vd-content{padding:20px;display:flex;flex-direction:column;gap:15px;align-items:center;text-align:center;}
.vd-mic-btn{width:80px;height:80px;border-radius:50%;border:2px solid #22303a;background:#03060f;color:#6FC8F0;font-size:32px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;}
.vd-mic-btn.listening{border-color:#ff3366;color:#ff3366;animation:pulse-mic 1.5s infinite;}
.vd-transcript{width:100%;min-height:60px;background:#03060f;border:1px dashed #22303a;border-radius:8px;padding:12px;font:16px 'Courier New',monospace;box-sizing:border-box;}
.vd-parsed{font:700 20px 'Courier New',monospace;color:#ffcc33;padding:12px;background:#16233d;border:2px solid #2a3b5c;border-radius:8px;width:100%;box-sizing:border-box;}
.vd-actions{display:flex;gap:10px;width:100%;justify-content:center;}
.vd-btn{font:700 16px 'Courier New',monospace;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;flex:1;}
.vd-btn.yes{background:#6FC8F0;color:#08131f;}
.vd-btn.no{background:#1d2942;color:#cfe6ff;border:1px solid #2a3b5c;}
.vd-learn-btn{background:#2a3b5c;border:none;color:#cfe6ff;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:4px;margin-right:10px;}
.vd-learn-btn:hover{background:#3b5078;}
.vd-learn-panel{display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:#0a0c12;z-index:2500;flex-direction:column;padding:20px;overflow-y:auto;box-sizing:border-box;}
.vd-learn-panel.open{display:flex;}
.vd-learn-title{font-size:18px;color:#6FC8F0;margin-bottom:15px;display:flex;justify-content:space-between;align-items:center;}
.vd-learn-close{background:none;border:none;color:#ff3366;cursor:pointer;font-size:24px;}
.vd-learn-section{margin-bottom:20px;text-align:left;}
.vd-learn-section h4{color:#ffcc33;margin:0 0 10px 0;font-size:14px;text-transform:uppercase;border-bottom:1px solid #22303a;padding-bottom:5px;}
.vd-learn-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;font:13px monospace;line-height:1.5;}
.vd-learn-list{font:13px monospace;color:#d6e6ef;margin:0;padding-left:20px;}
.vd-learn-list li{margin-bottom:6px;}
/* ICON FACE — the VOICE launcher becomes a tile IN LINE with CHAT + MQTT on the
   clock row (the shared dock CSS lives in the static lcars.css, which isn't
   redeployed, so voice's tile + row placement are bundled here). Row (edge→in):
   CHAT(26) · MQTT(76) · VOICE(126) · CLOCK(186), all bottom:33. */
html[data-face="icons"] .voice-launch.has-face-icon{
  background:var(--face-icon) center/contain no-repeat !important;background-color:transparent !important;
  width:40px;height:40px;min-width:40px;padding:0;border:none;border-radius:10px;font-size:0;letter-spacing:0;color:transparent;box-shadow:none;overflow:visible;gap:0;
  right:126px !important;left:auto !important;bottom:33px !important;position:fixed !important;}
html[data-chirality="right"][data-face="icons"] .voice-launch.has-face-icon{left:126px !important;right:auto !important;}
html[data-face="icons"] .voice-launch.has-face-icon:hover{background-image:var(--face-icon-hover,var(--face-icon)) !important;transform:none;}
html[data-face="icons"] .voice-launch.has-face-icon::after{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:3px;font:900 8px 'Courier New',monospace;letter-spacing:1px;color:#8fa8c8;white-space:nowrap;pointer-events:none;content:'VOICE';}
/* Shift the clock inboard so it doesn't collide with the new VOICE tile. */
html[data-face="icons"] .ptp-clock{right:186px !important;}
html[data-chirality="right"][data-face="icons"] .ptp-clock{left:186px !important;right:auto !important;}
`;

export function initVoiceDock(): void {
  addStyles('voice-dock-styles', CSS);
  
  const launch = document.createElement('button');
  launch.className = 'voice-launch';
  launch.title = 'Voice Dispatch Commands';
  launch.innerHTML = '🎤 VOICE';

  const panel = document.createElement('div');
  panel.className = 'voice-panel';
  panel.innerHTML = `
    <div class="vd-head">
      <b>Voice Dispatch</b>
      <div>
        <button class="vd-learn-btn" title="Learn Commands">LEARN</button>
        <button class="vd-x" title="Close">×</button>
      </div>
    </div>
    <div class="vd-content">
      <button class="vd-mic-btn">🎤</button>
      <div class="vd-status">Click to start listening...</div>
      <div class="vd-transcript">...</div>
      <div class="vd-parsed">-</div>
      <div class="vd-confirm-text">Waiting for input...</div>
      <div class="vd-actions" style="display:none">
        <button class="vd-btn yes">YES</button>
        <button class="vd-btn no">NO</button>
      </div>
    </div>
    <div class="vd-learn-panel">
       <div class="vd-learn-title">
          <b>Grammar & Commands</b>
          <button class="vd-learn-close">×</button>
       </div>
       <div class="vd-learn-section">
          <h4>Learned Commands</h4>
          <ul class="vd-learn-list">
             <li>"take camera 1" / "cut to camera 1"</li>
             <li>"take camera 2" / "cut to camera 2"</li>
             <li>"preview camera 2"</li>
             <li>"mute all" / "panic"</li>
             <li>"start prompter"</li>
             <li>"stop prompter"</li>
          </ul>
       </div>
       <div class="vd-learn-section">
          <h4>Vocabulary Combinations</h4>
          <div class="vd-learn-grid">
             <div>
                <b style="color:#6FC8F0">Verbs</b><br>
                take, cut, preview, mix, wipe, key, mute, start, stop, roll, hold, fade, clear
             </div>
             <div>
                <b style="color:#6FC8F0">Nouns</b><br>
                camera, prompter, server, graphics, lower third, audio, mic, studio, iso, tally
             </div>
             <div>
                <b style="color:#6FC8F0">Modifiers</b><br>
                to, all, on, off, up, down, full, next, previous, instantly, softly
             </div>
             <div>
                <b style="color:#6FC8F0">Targets</b><br>
                1, 2, 3, 4, 5, 6, 7, 8, primary, secondary, program, preview
             </div>
          </div>
       </div>
    </div>
  `;
  launchDock().append(launch);   // shared flex dock — voice + chat always side by side
  document.body.append(panel);

  const micBtn = panel.querySelector<HTMLElement>('.vd-mic-btn')!;
  const statusText = panel.querySelector<HTMLElement>('.vd-status')!;
  const transcriptBox = panel.querySelector<HTMLElement>('.vd-transcript')!;
  const parsedBox = panel.querySelector<HTMLElement>('.vd-parsed')!;
  const confirmText = panel.querySelector<HTMLElement>('.vd-confirm-text')!;
  const actionRow = panel.querySelector<HTMLElement>('.vd-actions')!;
  const yesBtn = panel.querySelector<HTMLElement>('.vd-btn.yes')!;
  const noBtn = panel.querySelector<HTMLElement>('.vd-btn.no')!;
  
  let listening = false;
  let recognition: any = null;
  let pendingCommand: any = null;

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      listening = true;
      micBtn.classList.add('listening');
      launch.classList.add('listening');
      statusText.textContent = 'Listening...';
      transcriptBox.textContent = '...';
      parsedBox.textContent = '-';
      parsedBox.style.color = '#ffcc33';
      confirmText.textContent = 'Analyzing...';
      actionRow.style.display = 'none';
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      transcriptBox.textContent = final || interim;
      if (final) processTranscript(final.trim().toLowerCase());
    };

    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove('listening');
      launch.classList.remove('listening');
      statusText.textContent = 'Microphone off.';
    };

    recognition.onerror = (e: any) => {
      statusText.textContent = 'Error: ' + e.error;
      micBtn.classList.remove('listening');
      launch.classList.remove('listening');
    };
  } else {
    statusText.textContent = 'Web Speech API unsupported.';
  }

  const processTranscript = (text: string) => {
    let intent = null;
    if (text.includes('take camera 1') || text.includes('cut to camera 1')) {
      intent = { display: 'TAKE CAMERA 1', key: 'program', value: 1 };
    } else if (text.includes('take camera 2') || text.includes('cut to camera 2')) {
      intent = { display: 'TAKE CAMERA 2', key: 'program', value: 2 };
    } else if (text.includes('preview camera 2')) {
      intent = { display: 'PREVIEW CAMERA 2', key: 'preview', value: 2 };
    } else if (text.includes('mute all') || text.includes('panic')) {
      intent = { display: 'MUTE ALL AUDIO', key: 'mute', value: true };
    } else if (text.includes('start prompter')) {
      intent = { display: 'PLAY PROMPTER', key: 'play', value: true };
    } else if (text.includes('stop prompter')) {
      intent = { display: 'STOP PROMPTER', key: 'play', value: false };
    } else {
      parsedBox.textContent = 'UNKNOWN COMMAND';
      parsedBox.style.color = '#ff3366';
      confirmText.textContent = 'Could not parse: "' + text + '"';
      return;
    }
    pendingCommand = intent;
    parsedBox.textContent = intent.display;
    parsedBox.style.color = '#ffcc33';
    confirmText.textContent = 'Is this what you meant?';
    actionRow.style.display = 'flex';
  };

  const toggleListen = () => {
    if (listening) recognition?.stop();
    else recognition?.start();
  };

  micBtn.addEventListener('click', toggleListen);
  launch.addEventListener('click', () => {
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
    } else {
      panel.classList.add('open');
      if (!listening) toggleListen();
    }
  });

  const learnBtn = panel.querySelector('.vd-learn-btn')!;
  const learnPanel = panel.querySelector('.vd-learn-panel')!;
  const learnClose = panel.querySelector('.vd-learn-close')!;

  learnBtn.addEventListener('click', () => {
    learnPanel.classList.add('open');
  });
  learnClose.addEventListener('click', () => {
    learnPanel.classList.remove('open');
  });

  panel.querySelector('.vd-x')!.addEventListener('click', () => {
    panel.classList.remove('open');
    if (listening) recognition?.stop();
  });

  yesBtn.addEventListener('click', () => {
    if (pendingCommand) {
      const bus = getBus();
      bus.publishValue('spog/command/' + pendingCommand.key, pendingCommand.value);
      
      parsedBox.textContent = 'EXECUTED';
      parsedBox.style.color = '#00ff00';
      confirmText.textContent = 'Command sent.';
      actionRow.style.display = 'none';
      pendingCommand = null;
      setTimeout(() => {
        parsedBox.textContent = '-';
        parsedBox.style.color = '#ffcc33';
        confirmText.textContent = 'Waiting for input...';
        panel.classList.remove('open');
      }, 1000);
    }
  });

  noBtn.addEventListener('click', () => {
    parsedBox.textContent = 'CANCELLED';
    parsedBox.style.color = '#ff3366';
    confirmText.textContent = 'Command aborted.';
    actionRow.style.display = 'none';
    pendingCommand = null;
    setTimeout(() => {
      parsedBox.textContent = '-';
      parsedBox.style.color = '#ffcc33';
      confirmText.textContent = 'Waiting for input...';
    }, 1000);
  });
}

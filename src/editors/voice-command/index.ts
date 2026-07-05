import type { EditorPlugin } from '../types.js';
import { el, addStyles } from '../../ui/dom.js';

const CSS = `
.vc { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; height: 100%; min-height: 0; color: #cfe6ff; position: relative; }
.vc-col { display: flex; flex-direction: column; gap: 10px; min-height: 0; position: relative; }
.vc-col h4 { margin: 0; color: #6FC8F0; font: 700 22px 'Courier New', monospace; letter-spacing: 2px; text-transform: uppercase; }
.vc-panel { flex: 1; display: flex; flex-direction: column; background: #03060f; border: 1px solid #1d2942; border-radius: 8px; padding: 20px; align-items: center; justify-content: center; text-align: center; }
.vc-mic-btn { width: 120px; height: 120px; border-radius: 50%; border: 4px solid #1d2942; background: #0a1122; color: #6FC8F0; font-size: 48px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.vc-mic-btn:hover { background: #16233d; }
.vc-mic-btn.listening { border-color: #ff3366; color: #ff3366; box-shadow: 0 0 20px rgba(255, 51, 102, 0.4); animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
.vc-transcript { margin-top: 30px; font: 24px 'Courier New', monospace; min-height: 80px; width: 100%; background: #0a1122; border: 1px dashed #1d2942; border-radius: 8px; padding: 20px; box-sizing: border-box; }
.vc-status { margin-top: 15px; font: 16px 'Courier New', monospace; color: #7e93b5; }
.vc-parsed { font: 700 28px 'Courier New', monospace; color: #ffcc33; margin-bottom: 30px; padding: 20px; background: #16233d; border-radius: 8px; border: 2px solid #2a3b5c; width: 100%; box-sizing: border-box; }
.vc-confirm-text { font: 20px 'Courier New', monospace; margin-bottom: 20px; }
.vc-actions { display: flex; gap: 20px; }
.vc-btn { font: 700 24px 'Courier New', monospace; padding: 15px 40px; border: none; border-radius: 8px; cursor: pointer; }
.vc-btn.yes { background: #6FC8F0; color: #08131f; }
.vc-btn.yes:hover { background: #56b0d8; }
.vc-btn.no { background: #1d2942; color: #cfe6ff; border: 1px solid #2a3b5c; }
.vc-btn.no:hover { background: #2a3b5c; }
`;

const plugin: EditorPlugin = {
  id: 'voice-command',
  title: 'VOICE DISPATCH',
  order: 10,
  match: (n) => /voice|command|dispatch/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-voice', CSS);

    const micBtn = el('button', { class: 'vc-mic-btn' }, ['🎤']);
    const statusText = el('div', { class: 'vc-status' }, ['Click microphone to start listening...']);
    const transcriptBox = el('div', { class: 'vc-transcript' }, ['']);

    const parsedCommandBox = el('div', { class: 'vc-parsed' }, ['-']);
    const confirmText = el('div', { class: 'vc-confirm-text' }, ['Waiting for input...']);
    const yesBtn = el('button', { class: 'vc-btn yes', style: 'display:none' }, ['YES, EXECUTE']);
    const noBtn = el('button', { class: 'vc-btn no', style: 'display:none' }, ['NO, CANCEL']);
    const actionRow = el('div', { class: 'vc-actions' }, [yesBtn, noBtn]);

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
        statusText.textContent = 'Listening (e.g. "Take Camera 1")...';
        transcriptBox.textContent = '...';
        confirmText.textContent = 'Analyzing...';
        yesBtn.style.display = 'none';
        noBtn.style.display = 'none';
        parsedCommandBox.style.color = '#ffcc33';
        parsedCommandBox.textContent = '-';
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        transcriptBox.textContent = final || interim;
        
        if (final) {
          processTranscript(final.trim().toLowerCase());
        }
      };

      recognition.onend = () => {
        listening = false;
        micBtn.classList.remove('listening');
        statusText.textContent = 'Microphone off.';
      };

      recognition.onerror = (e: any) => {
        statusText.textContent = 'Error: ' + e.error;
        micBtn.classList.remove('listening');
      };

    } else {
      statusText.textContent = 'Web Speech API not supported in this browser. Please use Chrome/Edge or implement Vosk-Browser.';
    }

    const processTranscript = (text: string) => {
      // Mock NLP mapping for demonstration
      let intent = null;
      if (text.includes('take camera 1') || text.includes('cut to camera 1')) {
        intent = { display: 'TAKE CAMERA 1', key: 'program', value: 1 };
      } else if (text.includes('take camera 2') || text.includes('cut to camera 2')) {
        intent = { display: 'TAKE CAMERA 2', key: 'program', value: 2 };
      } else if (text.includes('preview camera 2')) {
        intent = { display: 'PREVIEW CAMERA 2', key: 'preview', value: 2 };
      } else if (text.includes('mute all') || text.includes('panic')) {
        intent = { display: 'MUTE ALL AUDIO', key: 'mute', value: true };
      } else if (text.includes('start prompter') || text.includes('play prompter')) {
        intent = { display: 'PLAY PROMPTER', key: 'play', value: true };
      } else if (text.includes('stop prompter')) {
        intent = { display: 'STOP PROMPTER', key: 'play', value: false };
      } else {
        parsedCommandBox.textContent = 'UNKNOWN COMMAND';
        parsedCommandBox.style.color = '#ff3366';
        confirmText.textContent = 'Could not map: "' + text + '" to a known action.';
        return;
      }

      pendingCommand = intent;
      parsedCommandBox.textContent = intent.display;
      parsedCommandBox.style.color = '#ffcc33';
      confirmText.textContent = 'Is this what you meant?';
      yesBtn.style.display = 'block';
      noBtn.style.display = 'block';
    };

    micBtn.addEventListener('click', () => {
      if (listening) {
        recognition?.stop();
      } else {
        recognition?.start();
      }
    });

    yesBtn.addEventListener('click', () => {
      if (pendingCommand) {
        // Execute by publishing to the bus
        ctx.services.publishParam?.(pendingCommand.key, pendingCommand.value, { throttle: false });
        
        parsedCommandBox.textContent = 'EXECUTED';
        parsedCommandBox.style.color = '#00ff00';
        confirmText.textContent = 'Command sent to SPOG routing bus.';
        yesBtn.style.display = 'none';
        noBtn.style.display = 'none';
        pendingCommand = null;
        
        setTimeout(() => {
          parsedCommandBox.textContent = '-';
          parsedCommandBox.style.color = '#ffcc33';
          confirmText.textContent = 'Waiting for input...';
        }, 2000);
      }
    });

    noBtn.addEventListener('click', () => {
      parsedCommandBox.textContent = 'CANCELLED';
      parsedCommandBox.style.color = '#ff3366';
      confirmText.textContent = 'Command aborted.';
      yesBtn.style.display = 'none';
      noBtn.style.display = 'none';
      pendingCommand = null;
      
      setTimeout(() => {
        parsedCommandBox.textContent = '-';
        parsedCommandBox.style.color = '#ffcc33';
        confirmText.textContent = 'Waiting for input...';
      }, 2000);
    });

    host.append(el('div', { class: 'vc' }, [
      el('div', { class: 'vc-col' }, [
        el('h4', {}, ['Voice Input']),
        el('div', { class: 'vc-panel' }, [
          micBtn,
          statusText,
          transcriptBox
        ])
      ]),
      el('div', { class: 'vc-col' }, [
        el('h4', {}, ['Command Output']),
        el('div', { class: 'vc-panel' }, [
          parsedCommandBox,
          confirmText,
          actionRow
        ])
      ])
    ]));
  }
};

export default plugin;

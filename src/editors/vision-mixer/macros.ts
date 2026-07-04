import type { MacroDef } from '../../model/index.js';

export class MacroRecorder {
  public recording: MacroDef | null = null;
  public macros: MacroDef[] = [];
  
  constructor(macros: MacroDef[] = []) {
    this.macros = [...macros];
  }
  
  startRecording(id: string, name: string) {
    this.recording = { id, name, actions: [] };
  }
  
  stopRecording() {
    if (this.recording) {
      const existing = this.macros.findIndex(m => m.id === this.recording!.id);
      if (existing >= 0) this.macros[existing] = this.recording;
      else this.macros.push(this.recording);
      this.recording = null;
    }
  }
  
  recordAction(topic: string, payload: unknown) {
    if (this.recording) {
      this.recording.actions.push({ topic, payload });
    }
  }
  
  playMacro(id: string, publish: (topic: string, payload: unknown) => void) {
    const macro = this.macros.find(m => m.id === id);
    if (!macro) return;
    
    // In a real system, we'd replay with timing. For now, sequential burst.
    macro.actions.forEach((a, i) => {
      setTimeout(() => publish(a.topic, a.payload), i * 33); // 33ms per action
    });
  }
}

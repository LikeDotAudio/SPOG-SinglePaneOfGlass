export class PrompterEngine {
  public speed = 40;
  public size = 34;
  public running = true;
  public mirrored = false;
  
  public uppercase = true;
  public stripCues = false;
  public lineHeight = 1.6;
  public textColor = '#ffffff';
  public bgColor = '#000000';
  public showLineNumbers = false;

  public y = 300;
  public prevY = 300;
  private bgY = 0;
  private prevTime = performance.now();
  
  private onPublish: (key: string, val: any, opts?: { throttle: boolean }) => void;
  private onTriggerGPO: (cmd: string) => void;
  private applyTransform: () => void;
  private stageHeight: () => number;
  private scrollHeight: () => number;
  private wheelBgStyle: (bgY: number) => void;

  constructor(opts: {
    onPublish: (key: string, val: any, opts?: { throttle: boolean }) => void;
    onTriggerGPO: (cmd: string) => void;
    applyTransform: () => void;
    stageHeight: () => number;
    scrollHeight: () => number;
    wheelBgStyle: (bgY: number) => void;
  }) {
    this.onPublish = opts.onPublish;
    this.onTriggerGPO = opts.onTriggerGPO;
    this.applyTransform = opts.applyTransform;
    this.stageHeight = opts.stageHeight;
    this.scrollHeight = opts.scrollHeight;
    this.wheelBgStyle = opts.wheelBgStyle;
  }

  public initY(stageH: number) {
    this.y = stageH || 300;
    this.prevY = this.y;
  }

  public setY(y: number) {
    this.y = y;
    this.prevY = y;
    this.applyTransform();
  }

  public tick() {
    const now = performance.now();
    const dt = (now - this.prevTime) / 1000;
    this.prevTime = now;
    
    if (this.running) {
      this.y -= this.speed * dt;
      this.bgY += (this.speed * dt) * 2;
      if (this.bgY > 20) this.bgY -= 20;
      else if (this.bgY < -20) this.bgY += 20;
      this.wheelBgStyle(this.bgY);
      
      const stageH = this.stageHeight();
      const scrollH = this.scrollHeight();
      if (this.y < -scrollH) {
        this.y = stageH;
        this.prevY = this.y;
      } else if (this.y > stageH) {
        this.y = -scrollH;
        this.prevY = this.y;
      }
      this.onPublish('position', this.y, { throttle: true });
      
      const midY = stageH * 0.50;
      return { prevY: this.prevY, currY: this.y, midY };
    }
    this.applyTransform();
    this.prevY = this.y;
    return null;
  }
}

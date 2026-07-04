export interface TransitionStyle {
  opacity: number;
  clipPath: string;
  transform: string;
}

export interface TransitionAction {
  id: string;
  name: string;
  emulate: (pct: number) => TransitionStyle;
}

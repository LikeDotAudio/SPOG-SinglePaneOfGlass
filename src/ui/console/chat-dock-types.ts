// src/ui/console/chat-dock-types — shared types for the global PRODUCTION CHAT dock.

export interface Endpoint { name: string; color: string }   // color = "r,g,b" triplet
export interface ChatMsg {
  id: string;
  seq: number;
  ts: number;
  from: Endpoint;
  to: Endpoint;
  kind: 'text' | 'image' | 'link';
  text?: string;                 // text body, or link caption
  href?: string;                 // link target
  media?: string;                // image data-URI (downscaled)
  full_id: string;               // === sender bus.sessionId (self-echo suppression)
}
export interface StoredChat { k: string; pair: string; m: ChatMsg }

/// <reference types="vite/client" />

// Static asset imports (Vite emits the file and returns its URL).
declare module '*.svg' {
  const url: string;
  export default url;
}

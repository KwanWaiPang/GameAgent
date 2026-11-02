/// <reference types="vite/client" />

interface SandlineDebug {
  simulation: import('./game/simulation').Simulation;
  start: () => void;
  audio: import('./audio').GameAudio;
}

declare global {
  interface Window {
    __SANDLINE__?: SandlineDebug;
  }
}

export {};

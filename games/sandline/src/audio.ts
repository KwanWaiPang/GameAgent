import type { GameEvent, WeaponKind } from './game/types';

type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number; noise?: boolean };

const SHOT: Record<WeaponKind, Tone> = {
  rifle: { freq: 140, dur: 0.09, gain: 0.22, noise: true },
  m4: { freq: 180, dur: 0.07, gain: 0.18, noise: true },
  smg: { freq: 220, dur: 0.05, gain: 0.14, noise: true },
  shotgun: { freq: 90, dur: 0.16, gain: 0.28, noise: true },
  sniper: { freq: 70, dur: 0.22, gain: 0.3, noise: true },
  pistol: { freq: 260, dur: 0.07, gain: 0.16, noise: true },
  deagle: { freq: 110, dur: 0.14, gain: 0.26, noise: true },
  knife: { freq: 640, dur: 0.08, type: 'sawtooth', gain: 0.05 },
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private master: GainNode | null = null;
  volume = 0.55;

  unlock() {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.master = master;
    this.noise = noise;
    return ctx;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(event: GameEvent, distance = 0) {
    if (this.volume <= 0) return;
    const falloff = 1 / (1 + distance * 0.08);
    if (event.type === 'shot' && event.weapon) this.tone({ ...SHOT[event.weapon], gain: (SHOT[event.weapon].gain ?? 0.1) * (event.actorId === 0 ? 1 : falloff) });
    else if (event.type === 'hit') this.tone({ freq: event.headshot ? 880 : 420, dur: 0.05, type: 'square', gain: 0.06 * (event.actorId === 0 || event.targetId === 0 ? 1 : falloff) });
    else if (event.type === 'kill' && event.actorId === 0) this.tone({ freq: 520, dur: 0.12, type: 'triangle', gain: 0.08 });
    else if (event.type === 'reload') this.tone({ freq: 180, dur: 0.08, type: 'square', gain: 0.04 });
    else if (event.type === 'step' && event.actorId === 0) this.tone({ freq: event.stepSurface === 'snow' ? 500 : 120, dur: 0.04, type: 'sine', gain: 0.03, noise: true });
    else if (event.type === 'explosion') this.tone({ freq: 60, dur: 0.35, gain: 0.3 * falloff, noise: true });
    else if (event.type === 'bombExplode') this.tone({ freq: 40, dur: 0.7, gain: 0.4, noise: true });
    else if (event.type === 'melee' && event.actorId === 0) this.tone(SHOT.knife);
    else if (event.type === 'grenadeThrow') this.tone({ freq: 240, dur: 0.06, type: 'triangle', gain: 0.05 });
  }

  ui(kind: 'confirm' | 'cancel') {
    this.tone(kind === 'confirm' ? { freq: 660, dur: 0.06, type: 'sine', gain: 0.05 } : { freq: 220, dur: 0.08, type: 'sine', gain: 0.04 });
  }

  private tone(tone: Tone) {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const gain = ctx.createGain();
    const peak = tone.gain ?? 0.1;
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tone.dur);
    gain.connect(this.master);
    if (tone.noise && this.noise) {
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = tone.freq * 8;
      source.connect(filter);
      filter.connect(gain);
      source.start();
      source.stop(ctx.currentTime + tone.dur);
    }
    const osc = ctx.createOscillator();
    osc.type = tone.type ?? 'triangle';
    osc.frequency.value = tone.freq;
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + tone.dur);
  }
}

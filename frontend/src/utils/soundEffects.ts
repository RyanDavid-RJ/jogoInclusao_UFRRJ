// frontend/src/utils/soundEffects.ts
// Sintetizador leve de efeitos sonoros via Web Audio API (zero dependências, zero MP3).
// Respeita preferência de mudo e degrada silenciosamente fora da Web ou sem AudioContext.

import { Platform } from "react-native";

export type SoundEffectName =
  | "click"
  | "dice"
  | "boost"
  | "obstacle"
  | "quiz_correct"
  | "quiz_wrong"
  | "victory"
  | "turn";

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;
let globalMuted = false;

export function setSoundMuted(muted: boolean) {
  globalMuted = muted;
}

export function isSoundMuted(): boolean {
  return globalMuted;
}

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined" || globalMuted) {
    return null;
  }
  const win = window as AudioWindow;
  const Ctor = win.AudioContext || win.webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  try {
    if (!audioCtx) {
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  {
    freq,
    endFreq,
    startOffset = 0,
    duration = 0.12,
    type = "sine",
    gain = 0.08,
  }: {
    freq: number;
    endFreq?: number;
    startOffset?: number;
    duration?: number;
    type?: OscillatorType;
    gain?: number;
  },
) {
  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, endFreq),
      start + duration,
    );
  }

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSound(effect: SoundEffectName) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  try {
    switch (effect) {
      case "click":
        playTone(ctx, { freq: 520, endFreq: 660, duration: 0.05, type: "triangle", gain: 0.04 });
        break;
      case "dice":
        playTone(ctx, { freq: 260, endFreq: 380, startOffset: 0, duration: 0.06, type: "triangle", gain: 0.07 });
        playTone(ctx, { freq: 340, endFreq: 480, startOffset: 0.07, duration: 0.06, type: "triangle", gain: 0.07 });
        playTone(ctx, { freq: 440, endFreq: 620, startOffset: 0.14, duration: 0.09, type: "sine", gain: 0.08 });
        break;
      case "boost":
        playTone(ctx, { freq: 523.25, startOffset: 0, duration: 0.1, type: "triangle", gain: 0.08 });
        playTone(ctx, { freq: 659.25, startOffset: 0.09, duration: 0.1, type: "triangle", gain: 0.08 });
        playTone(ctx, { freq: 783.99, startOffset: 0.18, duration: 0.16, type: "sine", gain: 0.09 });
        break;
      case "obstacle":
        playTone(ctx, { freq: 440, startOffset: 0, duration: 0.12, type: "sawtooth", gain: 0.05 });
        playTone(ctx, { freq: 349.23, startOffset: 0.14, duration: 0.18, type: "triangle", gain: 0.06 });
        break;
      case "quiz_correct":
        playTone(ctx, { freq: 523.25, startOffset: 0, duration: 0.1, type: "sine", gain: 0.08 });
        playTone(ctx, { freq: 659.25, startOffset: 0.08, duration: 0.1, type: "sine", gain: 0.08 });
        playTone(ctx, { freq: 783.99, startOffset: 0.16, duration: 0.12, type: "sine", gain: 0.09 });
        playTone(ctx, { freq: 1046.5, startOffset: 0.25, duration: 0.2, type: "triangle", gain: 0.08 });
        break;
      case "quiz_wrong":
        playTone(ctx, { freq: 311.13, startOffset: 0, duration: 0.14, type: "triangle", gain: 0.06 });
        playTone(ctx, { freq: 246.94, startOffset: 0.14, duration: 0.22, type: "triangle", gain: 0.05 });
        break;
      case "turn":
        playTone(ctx, { freq: 587.33, startOffset: 0, duration: 0.09, type: "sine", gain: 0.06 });
        playTone(ctx, { freq: 880, startOffset: 0.08, duration: 0.12, type: "sine", gain: 0.06 });
        break;
      case "victory":
        playTone(ctx, { freq: 523.25, startOffset: 0, duration: 0.12, type: "triangle", gain: 0.09 });
        playTone(ctx, { freq: 659.25, startOffset: 0.11, duration: 0.12, type: "triangle", gain: 0.09 });
        playTone(ctx, { freq: 783.99, startOffset: 0.22, duration: 0.12, type: "triangle", gain: 0.09 });
        playTone(ctx, { freq: 1046.5, startOffset: 0.34, duration: 0.32, type: "sine", gain: 0.1 });
        break;
    }
  } catch {
    // ignore audio playback restrictions
  }
}

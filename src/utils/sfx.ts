// Ultra-subtle Apple-like Liquid Glass tactile micro-ticks (zero latency, Web Audio synthesized)
let audioContext: AudioContext | null = null;

export function playLiquidTickSfx(type: 'grab' | 'scrub' | 'release' = 'scrub') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);

    if (type === 'grab') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.018);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.026, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      osc.connect(filter).connect(gain).connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.022);
    } else if (type === 'release') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(1060, now + 0.022);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.028, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);
      osc.connect(filter).connect(gain).connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.028);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1480, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.012);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);
      osc.connect(filter).connect(gain).connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.016);
    }
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}

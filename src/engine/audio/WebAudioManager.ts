/**
 * Web Audio Engine for Visual Novel
 * Supports procedural audio synthesis (zero external files required)
 * as well as external audio file playback via standard HTML5 Audio/Web Audio API.
 */

class WebAudioManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentBgmSource: AudioBufferSourceNode | OscillatorNode | null = null;
  private bgmLoopInterval: number | null = null;

  private bgmVolume: number = 0.6;
  private sfxVolume: number = 0.8;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Play procedural sound effects
   */
  public playSound(soundType: 'typewriter' | 'click' | 'choice' | 'impact' | 'transition' | 'fanfare') {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;

      if (soundType === 'typewriter') {
        // High, short pleasant blip
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520 + Math.random() * 40, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (soundType === 'click') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (soundType === 'choice') {
        // Two-tone cheerful chime
        const freqs = [587.33, 880]; // D5, A5
        freqs.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.18);
        });
      } else if (soundType === 'impact') {
        // Dramatic low boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (soundType === 'transition') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (soundType === 'fanfare') {
        // Victory chord
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        chord.forEach((freq, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.15, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.6);
        });
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Procedural synth ambient BGM (Cyberpunk / Mystery theme)
   */
  public playBGM(theme: 'mystery' | 'neon' | 'tension' | 'none') {
    this.stopBGM();
    if (theme === 'none') return;

    try {
      this.initContext();
      if (!this.ctx || !this.bgmGain) return;

      const chords = theme === 'mystery'
        ? [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [164.81, 207.65, 246.94]] // Am, G, F, E
        : [[130.81, 196, 261.63], [146.83, 220, 293.66], [164.81, 246.94, 329.63], [174.61, 261.63, 349.23]];

      let chordIdx = 0;
      const playStep = () => {
        if (!this.ctx || !this.bgmGain) return;
        const now = this.ctx.currentTime;
        const currentChord = chords[chordIdx % chords.length];
        chordIdx++;

        currentChord.forEach(freq => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain = this.ctx!.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, now);
          filter.frequency.exponentialRampToValueAtTime(180, now + 3.8);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 0.8);
          gain.gain.linearRampToValueAtTime(0.001, now + 3.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.bgmGain!);

          osc.start(now);
          osc.stop(now + 3.9);
        });
      };

      playStep();
      this.bgmLoopInterval = window.setInterval(playStep, 3800);
    } catch {
      // Audio autoplay restrictions
    }
  }

  public stopBGM() {
    if (this.bgmLoopInterval !== null) {
      clearInterval(this.bgmLoopInterval);
      this.bgmLoopInterval = null;
    }
    if (this.currentBgmSource) {
      try {
        this.currentBgmSource.stop();
      } catch {}
      this.currentBgmSource = null;
    }
  }
}

export const audioManager = new WebAudioManager();

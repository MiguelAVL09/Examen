// Web Audio API Sound Synthesizer for Kahoot-style audio feedback & lobby grooves
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lobbyTimer: number | null = null;
  private isPlayingLobby: boolean = false;

  constructor() {
    const savedMute = localStorage.getItem('kahoot_quiz_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('kahoot_quiz_muted', String(this.isMuted));
    if (this.isMuted && this.isPlayingLobby) {
      this.stopLobbyMusic();
    }
    return this.isMuted;
  }

  // Ticking sound for countdown (frequency rises as time runs out)
  public playTick(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 520 * Math.max(0.8, pitchMultiplier);
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio playback allowed to fail gracefully
    }
  }

  // Cheerful double chime for correct answers
  public playCorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22); // C6
      gain2.gain.setValueAtTime(0.25, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.48);
    } catch {
      // Audio fallback
    }
  }

  // Low buzz/thud for incorrect answers
  public playWrong() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // Audio fallback
    }
  }

  // Dramatic alarm when time expires
  public playTimesUp() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [220, 164.81].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.18, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.32);
      });
    } catch {
      // Audio fallback
    }
  }

  // Streak bonus sound: fast ascending arcade arpeggio
  public playStreakBonus() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.2, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } catch {
      // Audio fallback
    }
  }

  // Victory fanfare for game podium
  public playPodiumFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const melody = [
        { freq: 523.25, time: 0, dur: 0.15 },
        { freq: 523.25, time: 0.15, dur: 0.15 },
        { freq: 523.25, time: 0.3, dur: 0.15 },
        { freq: 659.25, time: 0.45, dur: 0.35 },
        { freq: 783.99, time: 0.8, dur: 0.35 },
        { freq: 1046.50, time: 1.15, dur: 0.8 },
      ];

      melody.forEach(item => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.freq, now + item.time);
        gain.gain.setValueAtTime(0.22, now + item.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + item.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + item.time);
        osc.stop(now + item.time + item.dur + 0.05);
      });
    } catch {
      // Audio fallback
    }
  }

  // Upbeat Kahoot-style funky lobby synth loop
  public startLobbyMusic() {
    if (this.isMuted || this.isPlayingLobby) return;
    this.isPlayingLobby = true;

    const ctx = this.getContext();
    if (!ctx) return;

    // Bassline and melody notes
    const bassline = [130.81, 146.83, 164.81, 174.61, 196.00, 164.81, 146.83, 130.81]; // C - D - E - F - G - E - D - C
    let step = 0;

    const playStep = () => {
      if (!this.isPlayingLobby || this.isMuted) return;
      const now = ctx.currentTime;

      // Bass synth pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassline[step % bassline.length], now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);

      // Light percussion click on off-beats
      if (step % 2 === 1) {
        const snare = ctx.createOscillator();
        const sGain = ctx.createGain();
        snare.type = 'square';
        snare.frequency.setValueAtTime(320, now);
        sGain.gain.setValueAtTime(0.04, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        snare.connect(sGain);
        sGain.connect(ctx.destination);
        snare.start(now);
        snare.stop(now + 0.09);
      }

      step++;
      this.lobbyTimer = window.setTimeout(playStep, 260);
    };

    playStep();
  }

  public stopLobbyMusic() {
    this.isPlayingLobby = false;
    if (this.lobbyTimer !== null) {
      clearTimeout(this.lobbyTimer);
      this.lobbyTimer = null;
    }
  }

  public getIsPlayingLobby(): boolean {
    return this.isPlayingLobby;
  }
}

export const soundEffects = new SoundSynthesizer();

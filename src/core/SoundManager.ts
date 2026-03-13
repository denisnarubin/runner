import { AssetLoader } from './AssetLoader';

export class SoundManager {
  private soundCache: Map<string, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private musicStarted = false;
  private isMusicMuted = false;
  private stepIndex = 0;
  private audioContext: AudioContext | null = null;
  private onMusicToggleCallback: ((isMuted: boolean) => void) | null = null;

  private readonly MUSIC_MUTE_KEY = 'game_music_muted';

  private readonly SOUND_LOADERS: Record<string, () => Promise<string>> = {
    'coin': () => import('../assets/sounds/coin.ogg?url').then(m => m.default),
    'bomb': () => import('../assets/sounds/bomb.ogg?url').then(m => m.default),
    'gate': () => import('../assets/sounds/gate.wav?url').then(m => m.default),
    'lose': () => import('../assets/sounds/STGR_Fail_Lose_forMUSIC_A_1.ogg?url').then(m => m.default),
    'win': () => import('../assets/sounds/win.ogg?url').then(m => m.default),
    'step_0': () => import('../assets/sounds/step_0.ogg?url').then(m => m.default),
    'step_1': () => import('../assets/sounds/step_1.ogg?url').then(m => m.default),
    'step_2': () => import('../assets/sounds/step_2.ogg?url').then(m => m.default),
  };

  constructor() {
    this.initializeAudioContext();
    this.loadMusicMuteState();
    this.preloadCriticalSounds();
    this.loadBackgroundMusic();
  }

  private loadMusicMuteState(): void {
    try {
      const saved = localStorage.getItem(this.MUSIC_MUTE_KEY);
      if (saved !== null) {
        this.isMusicMuted = saved === 'true';
      }
    } catch (_e: unknown) {
    }
  }

  private saveMusicMuteState(): void {
    try {
      localStorage.setItem(this.MUSIC_MUTE_KEY, String(this.isMusicMuted));
    } catch (_e: unknown) {
    }
  }

  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch (_e: unknown) {
    }
  }

  public async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (_e: unknown) {
      }
    }
  }

  private preloadCriticalSounds(): void {
    const critical = ['step_0', 'step_1', 'step_2', 'gate'];
    critical.forEach(name => {
      const loader = this.SOUND_LOADERS[name];
      if (loader) {
        AssetLoader.loadSound(name, loader).then(audio => {
          this.setupAudio(audio, name);
        }).catch((_err: unknown) => {
        });
      }
    });
  }

  private async loadBackgroundMusic(): Promise<void> {
    try {
      const url = await import('../assets/sounds/music_halloween party [loop].ogg?url').then(m => m.default);
      const music = new Audio(url);
      music.loop = true;
      music.volume = 0.2;
      music.preload = 'auto';
      this.backgroundMusic = music;
    } catch (_e: unknown) {
    }
  }

  private setupAudio(audio: HTMLAudioElement, name: string): void {
    audio.preload = 'auto';
    if (name.startsWith('step')) audio.volume = 0.12;
    else if (name === 'bomb') audio.volume = 0.35;
    else if (name === 'gate') audio.volume = 0.5;
    else if (name === 'lose') audio.volume = 0.45;
    else if (name === 'win') audio.volume = 0.5;
    else if (name === 'coin') audio.volume = 0.25;
    else audio.volume = 0.25;
    this.soundCache.set(name, audio);
  }

  public async playSound(name: string): Promise<void> {
    try {
      await this.resumeAudioContext();
      let audio = this.soundCache.get(name);
      if (!audio) {
        const loader = this.SOUND_LOADERS[name];
        if (!loader) return;
        audio = await AssetLoader.loadSound(name, loader);
        this.setupAudio(audio, name);
      }
      if (name === 'gate' || name === 'win' || name === 'lose') {
        audio.currentTime = 0;
        await audio.play();
      } else {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = audio.volume;
        await clone.play();
      }
    } catch (_err: unknown) {
    }
  }

  public playStepSound(): void {
    const stepName = `step_${this.stepIndex}`;
    this.playSound(stepName);
    this.stepIndex = (this.stepIndex + 1) % 3;
  }

  public playBackgroundMusic(): void {
    if (this.isMusicMuted) return;
    if (this.backgroundMusic && !this.musicStarted) {
      this.resumeAudioContext().then(() => {
        this.backgroundMusic?.play()
          .then(() => { this.musicStarted = true; })
          .catch((_err: unknown) => { });
      });
    }
  }

  public stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.musicStarted = false;
    }
  }

  public async fadeMusicOut(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.backgroundMusic || this.isMusicMuted) {
        resolve();
        return;
      }
      const startTime = Date.now();
      const startVolume = this.backgroundMusic.volume;
      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        this.backgroundMusic!.volume = startVolume * (1 - progress);
        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          this.backgroundMusic!.pause();
          this.backgroundMusic!.currentTime = 0;
          this.musicStarted = false;
          this.backgroundMusic!.volume = 0.2;
          resolve();
        }
      };
      fade();
    });
  }

  public toggleMusic(): void {
    this.isMusicMuted = !this.isMusicMuted;
    this.saveMusicMuteState();
    console.log('Music toggle:', this.isMusicMuted ? 'MUTED' : 'PLAYING');
    if (this.backgroundMusic) {
      if (this.isMusicMuted) {
        this.backgroundMusic.pause();
        this.musicStarted = false;
      } else {
        this.resumeAudioContext().then(() => {
          this.backgroundMusic?.play()
            .then(() => { this.musicStarted = true; })
            .catch((_err: unknown) => { });
        });
      }
    }
    if (this.onMusicToggleCallback) {
      this.onMusicToggleCallback(this.isMusicMuted);
    }
  }

  public setOnMusicToggleCallback(callback: (isMuted: boolean) => void): void {
    this.onMusicToggleCallback = callback;
    callback(this.isMusicMuted);
  }

  public isMusicMutedValue(): boolean {
    return this.isMusicMuted;
  }

  public getBackgroundMusic(): HTMLAudioElement | null {
    return this.backgroundMusic;
  }
}
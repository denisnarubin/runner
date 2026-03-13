import soundOnUrl from '../assets/textures/sound_on_coffee.png?url';
import soundOffUrl from '../assets/textures/sound_off_coffee.png?url';

export class MusicControls {
  private musicButton: HTMLImageElement | null = null;
  private isMusicMuted = false;
  private onToggleCallback: (() => void) | null = null;

  constructor(onToggle?: () => void) {
    if (onToggle) {
      this.onToggleCallback = onToggle;
    }
    this.createMusicControls();
  }

  private createMusicControls(): void {
    const container = document.createElement('div');
    container.id = 'music-controls';
    document.body.appendChild(container);

    const img = document.createElement('img');
    img.src = soundOnUrl;
    img.alt = 'sound on';
    img.draggable = false;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      cursor: pointer;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
      transition: all 0.2s ease;
    `;

    container.appendChild(img);
    this.musicButton = img;

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleToggle();
    });


    container.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleToggle();
    });

    img.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.1)';
    });

    img.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)';
    });

    this.updateMusicButtonStyles();
  }

  private handleToggle(): void {
    this.isMusicMuted = !this.isMusicMuted;
    this.updateMusicButtonIcon();
    if (this.onToggleCallback) {
      this.onToggleCallback();
    }
  }

  private updateMusicButtonIcon(): void {
    if (!this.musicButton) return;
    this.musicButton.src = this.isMusicMuted ? soundOffUrl : soundOnUrl;
    this.musicButton.alt = this.isMusicMuted ? 'sound off' : 'sound on';
  }

  public updateMusicButtonStyles(): void {
    const container = document.getElementById('music-controls');
    if (!container || !this.musicButton) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    let buttonSize: number, bottomOffset: number, leftOffset: number;

    if (width >= 1920) { buttonSize = 70; bottomOffset = 35; leftOffset = 35; }
    else if (width >= 1440) { buttonSize = 60; bottomOffset = 30; leftOffset = 30; }
    else if (width >= 1024) { buttonSize = 55; bottomOffset = 25; leftOffset = 25; }
    else if (width >= 768) { buttonSize = 50; bottomOffset = 20; leftOffset = 20; }
    else if (width >= 576) { buttonSize = 45; bottomOffset = 15; leftOffset = 15; }
    else if (width >= 425) { buttonSize = 40; bottomOffset = 12; leftOffset = 12; }
    else { buttonSize = 35; bottomOffset = 10; leftOffset = 10; }

    if (height < 500 && width > height) {
      buttonSize = Math.min(buttonSize, 40);
      bottomOffset = 8;
      leftOffset = 8;
    }

    container.style.cssText = `
      position: fixed;
      left: ${leftOffset}px;
      bottom: ${bottomOffset}px;
      width: ${buttonSize}px;
      height: ${buttonSize}px;
      z-index: 1000;
      cursor: pointer;
    `;
  }


  public setIsMuted(muted: boolean): void {
    this.isMusicMuted = muted;
    this.updateMusicButtonIcon();
  }

  public isMuted(): boolean {
    return this.isMusicMuted;
  }
}
import { CoinCounter } from '../ui/CoinCounter';
import { MusicControls } from '../ui/MusicControls';
import { SwipeHandHint } from '../ui/SwipeHandHint';
import { EndScreen } from '../ui/EndScreen';
import { SoundManager } from './SoundManager';
import * as THREE from 'three';

export class GameUI {
  private coinCounter: CoinCounter;
  private musicControls: MusicControls;
  private swipeHandHint: SwipeHandHint;
  private endScreen: EndScreen | null = null;
  private scene: THREE.Scene;
  private currentScore: number = 0;
  private soundManager: SoundManager | null = null;

  constructor(scene: THREE.Scene, score: number = 0, soundManager?: SoundManager) {
    this.scene = scene;
    this.currentScore = score;
    this.coinCounter = new CoinCounter();
    
    this.musicControls = new MusicControls(() => {
      if (this.soundManager) {
        this.soundManager.toggleMusic();
      }
    });
    
    this.swipeHandHint = new SwipeHandHint();
    this.endScreen = new EndScreen(score);
    this.createFinishLine();
    
    if (soundManager) {
      this.setSoundManager(soundManager);
    }
  }

  public setSoundManager(soundManager: SoundManager): void {
    this.soundManager = soundManager;
    this.musicControls.setIsMuted(soundManager.isMusicMutedValue());
    this.soundManager.setOnMusicToggleCallback((isMuted: boolean) => {
      this.musicControls.setIsMuted(isMuted);
    });
  }

  private createFinishLine(): void {
    const finishLineZ = 300;
    const finishGroup = new THREE.Group();
    const tileSize = 0.5;
    const roadMinX = -3;
    const roadMaxX = 3;
    const tilesZ = 3;
    const tilesX = Math.ceil((roadMaxX - roadMinX) / tileSize);
    const totalLength = tilesZ * tileSize;
    const startZ = finishLineZ - totalLength / 2;

    for (let i = 0; i < tilesX; i++) {
      for (let j = 0; j < tilesZ; j++) {
        const isBlack = (i + j) % 2 === 0;
        const material = new THREE.MeshStandardMaterial({
          color: isBlack ? 0x000000 : 0xffffff,
          emissive: isBlack ? 0x111111 : 0x444444,
          emissiveIntensity: 0.2
        });
        const geometry = new THREE.BoxGeometry(tileSize - 0.02, 0.05, tileSize - 0.02);
        const tile = new THREE.Mesh(geometry, material);
        const xPos = roadMinX + (i * tileSize) + (tileSize / 2);
        const zPos = startZ + (j * tileSize) + (tileSize / 2);
        tile.position.set(xPos, 0.02, zPos);
        finishGroup.add(tile);
      }
    }
    this.scene.add(finishGroup);
  }

  public updateScore(score: number): void {
    this.currentScore = score;
    this.coinCounter.update(score);
  }

  public getScore(): number {
    return this.currentScore;
  }

  public setScore(score: number): void {
    this.currentScore = score;
    this.coinCounter.setScore(score);
  }

  public addScore(value: number): void {
    this.currentScore += value;
    this.coinCounter.addScore(value);
  }

  public onResize(): void {
    this.coinCounter.updateStyles();
    this.musicControls.updateMusicButtonStyles();
    this.swipeHandHint.updateSwipeHandStyles();
  }

  public updateSwipeHandVisibility(isMoving: boolean): void {
    this.swipeHandHint.updateVisibility(isMoving);
  }

  public setTutorialVisible(visible: boolean): void {
    this.swipeHandHint.setTutorialVisible(visible);
  }

  public setGameOver(gameOver: boolean): void {
    this.swipeHandHint.setGameOver(gameOver);
  }

  public setFinished(finished: boolean): void {
    this.swipeHandHint.setFinished(finished);
  }

  public resetMoveTimer(): void {
    this.swipeHandHint.resetMoveTimer();
  }

  public showEndScreen(isWin: boolean): void {
    this.endScreen = new EndScreen(this.currentScore);
    if (this.endScreen) {
      this.endScreen.show(isWin);
    }
  }

  public getMusicControls(): MusicControls {
    return this.musicControls;
  }
}
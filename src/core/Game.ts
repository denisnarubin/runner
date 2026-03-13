import * as THREE from 'three';
import { World } from './World';
import { Player } from './Player';
import { Gate } from './Gate';
import { SoundManager } from './SoundManager';
import { EffectsManager } from './EffectsManager';
import { GameUI } from './GameUI';

type ObjectWithType = THREE.Object3D & {
  type?: 'coin' | 'bomb' | 'gate';
  scoreValue?: number;
  initialRotation?: number;
  isCollected?: boolean;
  visible?: boolean;
  gate?: Gate;
};

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World | null = null;
  private player: Player | null = null;
  private characterLight: THREE.PointLight | null = null;
  private clock = new THREE.Clock();
  private isGameOver = false;
  private isFinished = false;
  private finishLineZ = 300;
  private readonly CAM_OFFSET_X = 0;
  private readonly CAM_OFFSET_Y = 4.5;
  private readonly CAM_OFFSET_Z = -8.5;
  private readonly CAM_LOOKAHEAD = 10;
  private readonly CAM_SMOOTH = 0.1;
  private tempVector = new THREE.Vector3();
  private soundManager: SoundManager;
  private effectsManager: EffectsManager;
  private gameUI: GameUI;
  

  private stepTimer = 0;
  private readonly STEP_SOUND_INTERVAL = 0.45;
  
  private audioContext: AudioContext | null = null;
  private isAudioUnlocked = false;
  private isMusicPlaying = false;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();
    this.scene.fog = new THREE.Fog(0xe0e0e0, 50, 150);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(this.CAM_OFFSET_X, this.CAM_OFFSET_Y, this.CAM_OFFSET_Z);
    this.camera.lookAt(0, 1.5, this.CAM_LOOKAHEAD);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    this.scene.add(dirLight);

    this.characterLight = new THREE.PointLight(0xffffff, 0.8, 30);
    this.characterLight.position.set(0, 5, 0);
    this.characterLight.castShadow = false;
    this.scene.add(this.characterLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.4);
    fillLight.position.set(5, 10, 5);
    this.scene.add(fillLight);

    this.world = new World(this.scene);
    this.player = new Player();
    this.scene.add(this.player.getMesh());

    this.soundManager = new SoundManager();
    this.effectsManager = new EffectsManager(this.scene);
    this.gameUI = new GameUI(this.scene, 0);

    this.gameUI.setSoundManager(this.soundManager);

    this.initializeAudioContext();
    this.setupControls();
    this.showTutorial();

    window.addEventListener('resize', () => {
      this.onResize();
    });
  }

  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();

        const unlockAudio = () => {
          if (!this.isAudioUnlocked && this.audioContext) {
            if (this.audioContext.state === 'suspended') {
              this.audioContext.resume().then(() => {
                this.isAudioUnlocked = true;
              }).catch((_err: unknown) => {
                this.isAudioUnlocked = true;
              });
            } else {
              this.isAudioUnlocked = true;
            }
          }
        };

        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
        window.addEventListener('keydown', unlockAudio, { once: true });
      }
    } catch (_e: unknown) {
      this.isAudioUnlocked = true;
    }
  }

  private createGradientBackground(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 256, 0, 0);
    gradient.addColorStop(0, '#4a9fd8');
    gradient.addColorStop(0.15, '#5ab9ea');
    gradient.addColorStop(0.3, '#87ceeb');
    gradient.addColorStop(0.45, '#a8d8ea');
    gradient.addColorStop(0.55, '#f5f5f5');
    gradient.addColorStop(0.6, '#e0e0e0');
    gradient.addColorStop(0.65, '#b8b8b8');
    gradient.addColorStop(0.75, '#8a8a8a');
    gradient.addColorStop(0.85, '#6a6a8a');
    gradient.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
  }

  private showTutorial(): void {
    this.gameUI.setTutorialVisible(false);
    this.gameUI.resetMoveTimer();
  }

  private setupControls(): void {
    let startX = 0;
    const onStart = (x: number) => { startX = x; };
    const onEnd = (x: number) => {
      if (this.isFinished || this.isGameOver) return;
      const diff = x - startX;
      if (Math.abs(diff) > 50) {
        this.player?.startMoving();
        this.unlockAndPlayMusic();
        if (diff > 0) {
          this.player?.moveRight();
        } else {
          this.player?.moveLeft();
        }
      }
    };

    window.addEventListener('mousedown', (e) => onStart(e.clientX));
    window.addEventListener('mouseup', (e) => onEnd(e.clientX));
    window.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX), { passive: true });

    window.addEventListener('keydown', (e) => {
      if (this.isFinished || this.isGameOver) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        this.player?.startMoving();
        this.unlockAndPlayMusic();
        if (e.key === 'ArrowLeft') {
          this.player?.moveLeft();
        }
        if (e.key === 'ArrowRight') {
          this.player?.moveRight();
        }
      }
    });

    this.gameUI.getMusicControls();
  }

  private unlockAndPlayMusic(): void {
    if (this.isMusicPlaying) return;
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.isAudioUnlocked = true;
        this.playMusic();
      }).catch((_err: unknown) => {
        this.playMusic();
      });
    } else {
      this.isAudioUnlocked = true;
      this.playMusic();
    }
  }

  private playMusic(): void {
    if (!this.isMusicPlaying) {
      this.isMusicPlaying = true;
      this.soundManager.playBackgroundMusic();
    }
  }

  start(): void {
    this.animate();
    window.addEventListener('resize', () => this.onResize());
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.player) {
      this.player.update(delta);


      if (this.player.isMovingForward() && !this.isGameOver && !this.isFinished) {
        this.stepTimer += delta;
        if (this.stepTimer >= this.STEP_SOUND_INTERVAL) {
          this.stepTimer = 0;
          this.soundManager.playStepSound();
        }
      }

      this.gameUI.updateSwipeHandVisibility(this.player.isMovingForward());

      if (this.world && !this.isFinished) {
        this.world.update(this.player.getPosition().z);
      }

      if (!this.isFinished && !this.isGameOver && this.player.getPosition().z >= this.finishLineZ) {
        this.handleFinish();
      }

      if (!this.isFinished && !this.isGameOver) {
        this.checkCollisions();
      }

      const pos = this.player.getPosition();
      this.camera.position.x += (pos.x - this.camera.position.x) * this.CAM_SMOOTH;
      this.camera.position.y += (this.CAM_OFFSET_Y - this.camera.position.y) * this.CAM_SMOOTH;
      this.camera.position.z += (pos.z + this.CAM_OFFSET_Z - this.camera.position.z) * this.CAM_SMOOTH;
      this.camera.lookAt(pos.x, 1.5, pos.z + this.CAM_LOOKAHEAD);

      if (this.characterLight) {
        this.characterLight.position.x = pos.x;
        this.characterLight.position.z = pos.z + 2;
      }
    }

    this.effectsManager.updateEffects(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private handleFinish(): void {
    if (this.isFinished) return;
    this.isFinished = true;
    this.gameUI.setFinished(true);

    if (this.player) {
      this.player.stopMoving();
    }

    if (this.player && !this.isGameOver) {
      this.player.faceCamera();
      this.soundManager.playSound('win');
      setTimeout(() => {
        if (this.player && !this.isGameOver) {
          this.player.playBreakdance(() => {
            setTimeout(() => {
              this.endGame(true);
            }, 1500);
          });
        }
      }, 300);
    }
  }

  private checkCollisions(): void {
    if (!this.player || !this.world || this.isGameOver || this.isFinished) return;

    const playerPos = this.player.getPosition();
    const objects = this.world.getActiveObjects();

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      const typedObj = obj as ObjectWithType;
      const type = typedObj.type;

      if (!obj.visible) continue;

      obj.getWorldPosition(this.tempVector);
      const distance = playerPos.distanceTo(this.tempVector);

      let shouldCollide = false;
      switch (type) {
        case 'bomb': shouldCollide = distance < 0.5; break;
        case 'coin': shouldCollide = distance < 0.8; break;
        case 'gate': shouldCollide = distance < 2.5; break;
      }

      if (shouldCollide) {
        this.handleCollision(obj, this.tempVector.clone());
      }
    }
  }

  private handleCollision(obj: THREE.Object3D, objPos: THREE.Vector3): void {
    const typedObj = obj as ObjectWithType;
    const type = typedObj.type;

    switch (type) {
      case 'coin':
        if (typedObj.isCollected) return;
        this.gameUI.addScore(1);
        obj.visible = false;
        typedObj.isCollected = true;
        this.soundManager.playSound('coin');
        break;

      case 'bomb':
        this.isGameOver = true;
        this.gameUI.setGameOver(true);
        this.effectsManager.createExplosion(objPos);
        this.soundManager.playSound('bomb');
        if (this.player) {
          this.player.playFall(() => {
            this.soundManager.playSound('lose');
            this.soundManager.stopBackgroundMusic();
            setTimeout(() => this.gameUI.showEndScreen(false), 500);
          });
        }
        this.world?.removeObject(obj);
        break;

      case 'gate':
        const gate = typedObj.gate;
        if (!gate || gate.isPassed()) return;
        const playerPos = this.player?.getPosition() || new THREE.Vector3();
        const side = playerPos.x < 0 ? 'left' : 'right';
        const modifier = gate.getModifier(side);
        if (modifier) {
          switch (modifier.type) {
            case '+': this.gameUI.addScore(modifier.value); break;
            case '-': this.gameUI.setScore(Math.max(0, this.gameUI.getScore() - modifier.value)); break;
            case 'x': this.gameUI.setScore(this.gameUI.getScore() * modifier.value); break;
          }
          this.soundManager.playSound('gate');
          gate.markAsPassed();
        }
        break;
    }
  }

  private endGame(success: boolean): void {
    this.isGameOver = true;
    this.gameUI.setGameOver(true);
    this.soundManager.stopBackgroundMusic();

    if (success && this.player) {
      this.player.faceCamera();
    }

    setTimeout(() => this.gameUI.showEndScreen(success), success ? 1500 : 500);
  }

  onResize(): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.gameUI.onResize();
  }
}
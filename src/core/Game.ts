import * as THREE from 'three';
import { World } from './World';
import { Player } from './Player';
import { Gate } from './Gate';
import { AssetLoader } from './AssetLoader';
// 🔥 ЗВУКИ — ленивая загрузка через dynamic import
// 🔥 ТЕКСТУРЫ — статический импорт (маленький размер)
import coinTextureUrl from '../assets/textures/coin.png?url';
import handTextureUrl from '../assets/textures/hand.png?url';
import soundOnUrl from '../assets/textures/sound_on_coffee.png?url';
import soundOffUrl from '../assets/textures/sound_off_coffee.png?url';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World | null = null;
  private player: Player | null = null;
  private characterLight: THREE.PointLight | null = null;
  private clock = new THREE.Clock();
  private score = 0;
  private isGameOver = false;
  private isTutorialVisible = true;
  private isFinished = false;
  private finishLineZ = 200;
  private activeEffects: Array<{ update(delta: number): boolean }> = [];
  private readonly CAM_OFFSET_X = 0;
  private readonly CAM_OFFSET_Y = 4.5;
  private readonly CAM_OFFSET_Z = -8;
  private readonly CAM_LOOKAHEAD = 10;
  private readonly CAM_SMOOTH = 0.1;
  private tempVector = new THREE.Vector3();
  private coinCounterElement: HTMLElement | null = null;
  private coinIconElement: HTMLElement | null = null;
  private coinContainer: HTMLElement | null = null;
  private soundCache: Map<string, HTMLAudioElement> = new Map();
  private stepIndex = 0;
  private stepTimer = 0;
  private readonly STEP_INTERVAL = 0.4;
  private backgroundMusic: HTMLAudioElement | null = null;
  private musicStarted = false;
  private isMusicMuted = false;
  private musicButton: HTMLImageElement | null = null;
  private musicTriggeredByInteraction = false;
  // 🔥 Свойства для руки-подсказки (PNG)
  private swipeHandContainer: HTMLElement | null = null;
  private swipeHandElement: HTMLImageElement | null = null;
  private swipeHintContainer: HTMLElement | null = null;
  private topHintElement: HTMLElement | null = null;
  private swipeTextElement: HTMLElement | null = null;
  private lastMoveTime: number = 0;
  private readonly HAND_SHOW_DELAY = 2000;
  private handAnimationId: number | null = null;
  private handPosition = 0;
  private readonly SOUND_LOADERS: Record<string, () => Promise<string>> = {
    'coin': () => import('../assets/sounds/coin.ogg?url').then(m => m.default),
    'bomb': () => import('../assets/sounds/bomb.ogg?url').then(m => m.default),
    'gate': () => import('../assets/sounds/gate.ogg?url').then(m => m.default),
    'lose': () => import('../assets/sounds/STGR_Fail_Lose_forMUSIC_A_1.ogg?url').then(m => m.default),
    'win': () => import('../assets/sounds/win.ogg?url').then(m => m.default),
    'step_0': () => import('../assets/sounds/step_0.ogg?url').then(m => m.default),
    'step_1': () => import('../assets/sounds/step_1.ogg?url').then(m => m.default),
    'step_2': () => import('../assets/sounds/step_2.ogg?url').then(m => m.default),
  };

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 80);
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

    this.createFinishLine();
    this.showTutorial();
    this.setupControls();
    this.createCoinCounter();
    this.createMusicControls();

    window.addEventListener('resize', () => {
      this.updateCoinCounterStyles();
      this.updateMusicButtonStyles();
      this.updateSwipeHandStyles();
    });

    this.preloadCriticalSounds();
  }

  private preloadCriticalSounds(): void {
    const critical = ['step_0', 'step_1', 'step_2'];
    critical.forEach(name => {
      const loader = this.SOUND_LOADERS[name];
      if (loader) {
        AssetLoader.loadSound(name, loader).then(audio => {
          this.setupAudio(audio, name);
        }).catch(err => {
          console.warn(`⚠️ Не удалось предзагрузить звук "${name}"`, err);
        });
      }
    });
    this.loadBackgroundMusic();
  }

  private async loadBackgroundMusic(): Promise<void> {
    try {
      const url = await import('../assets/sounds/music_halloween party [loop].ogg?url').then(m => m.default);
      const music = new Audio(url);
      music.loop = true;
      music.volume = 0.3;
      music.oncanplaythrough = () => {
        console.log('✅ Музыка готова');
      };
      this.backgroundMusic = music;
    } catch (e) {
      console.warn('⚠️ Не удалось предзагрузить музыку:', e);
    }
  }

  private setupAudio(audio: HTMLAudioElement, name: string): void {
    if (name.startsWith('step')) audio.volume = 0.25;
    else if (name === 'bomb') audio.volume = 0.6;
    else if (name === 'gate') audio.volume = 1.0;
    else if (name === 'lose') audio.volume = 0.7;
    else if (name === 'win') audio.volume = 0.8;
    else audio.volume = 0.5;
    this.soundCache.set(name, audio);
  }

  private playBackgroundMusic(): void {
    if (this.backgroundMusic && !this.musicStarted && !this.isMusicMuted && !this.musicTriggeredByInteraction) {
      this.backgroundMusic.play()
        .then(() => {
          this.musicStarted = true;
          this.musicTriggeredByInteraction = true;
        })
        .catch((err) => { console.warn('⚠️ Не удалось запустить музыку:', err); });
    }
  }

  private stopBackgroundMusic(): void {
    if (this.backgroundMusic && this.musicStarted) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.musicStarted = false;
    }
  }

  private toggleMusic(): void {
    this.isMusicMuted = !this.isMusicMuted;
    if (this.backgroundMusic) {
      if (this.isMusicMuted) {
        this.backgroundMusic.pause();
        this.musicStarted = false;
      } else {
        this.backgroundMusic.play()
          .then(() => { this.musicStarted = true; })
          .catch(err => console.warn('⚠️ Не удалось возобновить музыку:', err));
      }
    }
    this.updateMusicButtonIcon();
  }

  private updateMusicButtonIcon(): void {
    if (!this.musicButton) return;
    this.musicButton.src = this.isMusicMuted ? soundOffUrl : soundOnUrl;
    this.musicButton.alt = this.isMusicMuted ? 'sound off' : 'sound on';
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
      this.toggleMusic();
    });

    img.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.1)';
      img.style.filter = 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4))';
    });
    img.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)';
      img.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))';
    });
    img.addEventListener('touchstart', (e) => {
      e.preventDefault();
      img.style.transform = 'scale(0.95)';
    });
    img.addEventListener('touchend', (e) => {
      e.preventDefault();
      img.style.transform = 'scale(1)';
    });

    this.updateMusicButtonStyles();
  }

  private updateMusicButtonStyles(): void {
    const container = document.getElementById('music-controls');
    if (!container || !this.musicButton) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    let buttonSize: number;
    let bottomOffset: number;
    let leftOffset: number;

    if (width >= 1920) {
      buttonSize = 70; bottomOffset = 35; leftOffset = 35;
    } else if (width >= 1440) {
      buttonSize = 60; bottomOffset = 30; leftOffset = 30;
    } else if (width >= 1024) {
      buttonSize = 55; bottomOffset = 25; leftOffset = 25;
    } else if (width >= 768) {
      buttonSize = 50; bottomOffset = 20; leftOffset = 20;
    } else if (width >= 576) {
      buttonSize = 45; bottomOffset = 15; leftOffset = 15;
    } else if (width >= 425) {
      buttonSize = 40; bottomOffset = 12; leftOffset = 12;
    } else {
      buttonSize = 35; bottomOffset = 10; leftOffset = 10;
    }

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
      transition: all 0.3s ease;
    `;

    const img = this.musicButton as HTMLImageElement;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      cursor: pointer;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
      transition: all 0.2s ease;
    `;
  }

  private playStepSound(): void {
    if (!this.player || this.isGameOver || this.isFinished) return;
    const stepName = `step_${this.stepIndex}`;
    this.playSound(stepName);
    this.stepIndex = (this.stepIndex + 1) % 3;
  }

  private createCoinCounter(): void {
    const container = document.createElement('div');
    container.id = 'coin-counter-container';
    document.body.appendChild(container);

    const coinIcon = document.createElement('img');
    coinIcon.src = coinTextureUrl;
    coinIcon.alt = 'coin';
    coinIcon.id = 'coin-icon';
    coinIcon.draggable = false;
    coinIcon.onerror = () => {
      const fallbackSpan = document.createElement('span');
      fallbackSpan.innerHTML = '🪙';
      fallbackSpan.id = 'coin-icon-fallback';
      fallbackSpan.style.cssText = `font-size: inherit; line-height: 1; display: inline-block;`;
      coinIcon.replaceWith(fallbackSpan);
      this.coinIconElement = fallbackSpan;
    };

    const countText = document.createElement('span');
    countText.id = 'coinCount';
    countText.textContent = `x${this.score}`;

    container.appendChild(coinIcon);
    container.appendChild(countText);

    this.coinContainer = container;
    this.coinCounterElement = countText;
    this.coinIconElement = coinIcon;
    this.updateCoinCounterStyles();
  }

  private updateCoinCounterStyles(): void {
    if (!this.coinContainer) return;

    const width = window.innerWidth;
    let containerStyles = `position: fixed; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: flex-end; background: linear-gradient(135deg, #ff6b6b, #ff8e8e); box-shadow: 0 4px 14px rgba(255, 107, 107, 0.5); z-index: 100; font-family: 'Poppins', 'Arial', sans-serif; pointer-events: none; overflow: visible; border: 2px solid rgba(255, 255, 255, 0.22); transition: all 0.3s ease;`;
    let iconStyles = `object-fit: contain; filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.55)); z-index: 101; position: relative; transition: all 0.3s ease;`;
    let textStyles = `color: #ffd700; font-weight: bold; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); text-align: center; letter-spacing: 1.5px; line-height: 1; transition: all 0.3s ease;`;

    if (width >= 1920) {
      containerStyles += `top: 45px; padding: 6px 28px 6px 0; height: 44px; min-width: 160px; border-radius: 24px;`;
      iconStyles += `width: 76px; height: 76px; margin-left: -86px; margin-right: -22px; margin-top: -24px; margin-bottom: -24px; left: -28px; transform: scale(1.06);`;
      textStyles += `font-size: 30px; min-width: 80px; margin-right: 6px;`;
    } else if (width >= 1440) {
      containerStyles += `top: 25px; padding: 3px 18px 3px 0; height: 30px; min-width: 110px; border-radius: 16px;`;
      iconStyles += `width: 52px; height: 52px; margin-left: -62px; margin-right: -14px; margin-top: -16px; margin-bottom: -16px; left: -19px; transform: scale(1.02);`;
      textStyles += `font-size: 20px; min-width: 55px; margin-right: 3px;`;
    } else if (width >= 1024) {
      containerStyles += `top: 20px; padding: 3px 16px 3px 0; height: 28px; min-width: 100px; border-radius: 15px;`;
      iconStyles += `width: 48px; height: 48px; margin-left: -56px; margin-right: -12px; margin-top: -14px; margin-bottom: -14px; left: -17px; transform: scale(1.02);`;
      textStyles += `font-size: 18px; min-width: 50px; margin-right: 3px;`;
    } else if (width >= 768) {
      containerStyles += `top: 18px; padding: 2px 14px 2px 0; height: 26px; min-width: 90px; border-radius: 14px;`;
      iconStyles += `width: 44px; height: 44px; margin-left: -50px; margin-right: -10px; margin-top: -12px; margin-bottom: -12px; left: -15px; transform: scale(1.01);`;
      textStyles += `font-size: 16px; min-width: 45px; margin-right: 2px;`;
    } else if (width >= 576) {
      containerStyles += `top: 16px; padding: 2px 12px 2px 0; height: 24px; min-width: 80px; border-radius: 12px;`;
      iconStyles += `width: 40px; height: 40px; margin-left: -46px; margin-right: -8px; margin-top: -10px; margin-bottom: -10px; left: -13px; transform: scale(1);`;
      textStyles += `font-size: 15px; min-width: 40px; margin-right: 2px;`;
    } else if (width >= 425) {
      containerStyles += `top: 14px; padding: 2px 10px 2px 0; height: 22px; min-width: 70px; border-radius: 11px;`;
      iconStyles += `width: 36px; height: 36px; margin-left: -42px; margin-right: -6px; margin-top: -9px; margin-bottom: -9px; left: -11px; transform: scale(0.99);`;
      textStyles += `font-size: 14px; min-width: 35px; margin-right: 2px;`;
    } else {
      containerStyles += `top: 12px; padding: 2px 8px 2px 0; height: 20px; min-width: 60px; border-radius: 10px;`;
      iconStyles += `width: 32px; height: 32px; margin-left: -38px; margin-right: -4px; margin-top: -8px; margin-bottom: -8px; left: -9px; transform: scale(0.98);`;
      textStyles += `font-size: 13px; min-width: 30px; margin-right: 2px;`;
    }

    this.coinContainer.style.cssText = containerStyles;

    const icon = this.coinIconElement;
    if (icon && icon.tagName === 'IMG') {
      (icon as HTMLImageElement).style.cssText = iconStyles;
    } else if (icon && (icon as HTMLElement).id === 'coin-icon-fallback') {
      let emojiSize = width >= 1920 ? '76px' : width >= 1440 ? '52px' : width >= 1024 ? '48px' : width >= 768 ? '44px' : width >= 576 ? '40px' : width >= 425 ? '36px' : '32px';
      let emojiLeft = width >= 1920 ? '-28px' : width >= 1440 ? '-19px' : width >= 1024 ? '-17px' : width >= 768 ? '-15px' : width >= 576 ? '-13px' : width >= 425 ? '-11px' : '-9px';
      icon.style.cssText = `font-size: ${emojiSize}; filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.55)); z-index: 101; position: relative; left: ${emojiLeft}; transition: all 0.3s ease; line-height: 1; display: inline-block;`;
    }

    if (this.coinCounterElement) {
      this.coinCounterElement.style.cssText = textStyles;
    }
  }

  private updateCoinCounter(): void {
    if (this.coinCounterElement) {
      this.coinCounterElement.textContent = `x${this.score}`;
    }
  }

  /**
   * Создает финишную линию поперек дороги (от левого края до правого)
   * 🔥 ИСПРАВЛЕНО: Ширина дороги: от -6 до 6 (12 единиц)
   * 🔥 Финиш занимает 3 ряда плиток по длине (вдоль движения) и точно соответствует ширине дороги
   */
  private createFinishLine(): void {
    const finishGroup = new THREE.Group();
    const tileSize = 0.5;

    // 🔥 ТОЧНОЕ ВЫРАВНИВАНИЕ ПО КРАЯМ ДОРОГИ
    // Дорога идет от -6 до 6 по оси X (ширина = 12 единиц)
    const roadMinX = -3;
    const roadMaxX = 3;
    const roadWidth = roadMaxX - roadMinX; // 12 единиц

    const tilesZ = 3; // 3 плитки по длине (вдоль движения)
    const tilesX = Math.ceil(roadWidth / tileSize); // 24 плитки по ширине

    const totalLength = tilesZ * tileSize; // 1.5 единицы
    const startZ = this.finishLineZ - totalLength / 2;

    for (let i = 0; i < tilesX; i++) {
      for (let j = 0; j < tilesZ; j++) {
        // Шахматный порядок для визуального эффекта
        const isBlack = (i + j) % 2 === 0;
        const color = isBlack ? 0x000000 : 0xffffff;
        const emissiveColor = isBlack ? 0x111111 : 0x444444;

        const material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: emissiveColor,
          emissiveIntensity: 0.2,
          roughness: 0.4,
          metalness: 0.1
        });

        const geometry = new THREE.BoxGeometry(tileSize - 0.02, 0.05, tileSize - 0.02);
        const tile = new THREE.Mesh(geometry, material);

        // 🔥 ТОЧНОЕ ПОЗИЦИОНИРОВАНИЕ ОТ -6 ДО 6
        // Центр первой плитки: -6 + tileSize/2 = -5.75
        // Центр последней плитки: 6 - tileSize/2 = 5.75
        const xPos = roadMinX + (i * tileSize) + (tileSize / 2);
        const zPos = startZ + (j * tileSize) + (tileSize / 2);

        // Проверяем, что плитка не выходит за пределы дороги
        const tileHalfWidth = (tileSize - 0.02) / 2;
        if (xPos - tileHalfWidth >= roadMinX - 0.01 && xPos + tileHalfWidth <= roadMaxX + 0.01) {
          tile.position.set(xPos, 0.02, zPos);
          tile.receiveShadow = true;
          tile.castShadow = false;
          finishGroup.add(tile);
        }
      }
    }

    this.scene.add(finishGroup);
  }

  private createExplosion(position: THREE.Vector3): void {
    this.createFlashLight(position);
    this.createExplosionCore(position);
    this.createSparksAndDebris(position);
    this.createFireball(position);
    this.createSmoke(position);
    setTimeout(() => { this.createShockwave(position); }, 300);
  }

  private createFlashLight(position: THREE.Vector3): void {
    const light = new THREE.PointLight(0xff6600, 5, 15);
    light.position.copy(position);
    this.scene.add(light);

    let life = 0;
    const maxLife = 0.3;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        light.intensity = 5 * (1 - progress);
        if (life >= maxLife) {
          this.scene.remove(light);
          light.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createExplosionCore(position: THREE.Vector3): void {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0.1 + Math.random() * 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 8 + Math.random() * 8;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
    }

    let life = 0;
    const maxLife = 0.8;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] = position.x + velocities[i].x * progress * 2;
          posArray[i * 3 + 1] = position.y + velocities[i].y * progress * 2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * progress * 2;
        }
        posAttr.needsUpdate = true;
        material.opacity = 1 - progress * 1.5;
        material.size = 0.4 * (1 - progress * 0.5);
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createFireball(position: THREE.Vector3): void {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,200,100,1)');
    gradient.addColorStop(0.7, 'rgba(255,100,0,0.8)');
    gradient.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      size: 1.5,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      color: 0xffaa33
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed * 0.5,
        Math.cos(phi) * speed
      ));
    }

    let life = 0;
    const maxLife = 1.5;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] = position.x + velocities[i].x * life * 1.5;
          posArray[i * 3 + 1] = position.y + 0.5 + velocities[i].y * life * 1.2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * life * 1.5;
        }
        posAttr.needsUpdate = true;
        material.opacity = 0.9 * (1 - progress * 0.8);
        material.size = 1.5 * (1 + progress);
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createSmoke(position: THREE.Vector3): void {
    const particleCount = 25;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(100,100,100,0.8)');
    gradient.addColorStop(0.5, 'rgba(80,80,80,0.5)');
    gradient.addColorStop(1, 'rgba(50,50,50,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      size: 2.0,
      map: texture,
      blending: THREE.NormalBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      color: 0x888888
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      velocities.push(new THREE.Vector3(
        Math.cos(theta) * speed,
        Math.random() * 2,
        Math.sin(theta) * speed
      ));
    }

    let life = 0;
    const maxLife = 2.2;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] = position.x + velocities[i].x * life * 1.5;
          posArray[i * 3 + 1] = position.y + 1.0 + velocities[i].y * life * 2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * life * 1.5;
        }
        posAttr.needsUpdate = true;
        material.opacity = 0.6 * (1 - progress * 0.7);
        material.size = 2.0 * (1 + progress);
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createSparksAndDebris(position: THREE.Vector3): void {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      colors[i * 3] = 0.9 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.3 + Math.random() * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 5 + Math.random() * 10;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
    }

    let life = 0;
    const maxLife = 1.0;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] = position.x + velocities[i].x * life * 2;
          posArray[i * 3 + 1] = position.y + velocities[i].y * life * 2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * life * 2;
        }
        posAttr.needsUpdate = true;
        material.opacity = 1 - progress * 1.5;
        material.size = 0.2 * (1 - progress * 0.8);
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createShockwave(position: THREE.Vector3): void {
    const segments = 32;
    const geometry = new THREE.RingGeometry(0.1, 0.5, segments);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.3, 'rgba(255,200,100,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,100,50,0.4)');
    gradient.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y += 0.5;
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    let life = 0;
    const maxLife = 0.8;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        const scale = 1 + progress * 5;
        ring.scale.set(scale, scale, scale);
        ring.material.opacity = 1 - progress;
        if (life >= maxLife) {
          this.scene.remove(ring);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createSwipeHandHint(): void {
    const container = document.createElement('div');
    container.id = 'swipe-hand-container';
    container.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(container);
    this.swipeHandContainer = container;

    const handImg = document.createElement('img');
    handImg.src = handTextureUrl;
    handImg.alt = 'swipe hand';
    handImg.draggable = false;
    handImg.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4));
    `;
    container.appendChild(handImg);
    this.swipeHandElement = handImg;

    const hintContainer = document.createElement('div');
    hintContainer.id = 'swipe-hint-container';
    hintContainer.style.cssText = `
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      z-index: 998;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 90vw;
      max-width: 800px;
    `;
    document.body.appendChild(hintContainer);
    this.swipeHintContainer = hintContainer;

    const topHint = document.createElement('div');
    topHint.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-weight: 700;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4);
      letter-spacing: 2px;
      padding: 4px 8px;
      white-space: normal;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      line-height: 1.2;
    `;

    const collectCoins = document.createElement('span');
    collectCoins.textContent = 'COLLECT COINS';
    collectCoins.style.cssText = `
      color: #ffd700;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.5);
    `;

    const and = document.createElement('span');
    and.textContent = 'AND';
    and.style.cssText = `
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
    `;

    const avoidBombs = document.createElement('span');
    avoidBombs.textContent = 'AVOID THE BOMBS';
    avoidBombs.style.cssText = `
      color: #e74c3c;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(231, 76, 60, 0.4);
    `;

    topHint.appendChild(collectCoins);
    topHint.appendChild(and);
    topHint.appendChild(avoidBombs);
    hintContainer.appendChild(topHint);
    this.topHintElement = topHint;

    const swipeHint = document.createElement('div');
    swipeHint.textContent = 'SWIPE';
    swipeHint.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-weight: 900;
      color: #d35400;
      text-align: center;
      text-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
      letter-spacing: 3px;
      padding: 8px 80px;
      background: linear-gradient(90deg, rgba(241, 196, 15, 0) 0%, rgba(241, 196, 15, 0.6) 20%, rgba(243, 156, 18, 0.8) 50%, rgba(241, 196, 15, 0.6) 80%, rgba(241, 196, 15, 0) 100%);
      border-radius: 30px;
      border: none;
      box-shadow: none;
      white-space: nowrap;
      max-width: 100%;
    `;
    hintContainer.appendChild(swipeHint);
    this.swipeTextElement = swipeHint;

    this.updateSwipeHandStyles();
  }

  private updateSwipeHandStyles(): void {
    if (!this.swipeHandContainer || !this.swipeHandElement) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const baseScale = Math.min(1.5, Math.max(0.5, width / 1024));

    let containerSize: number;
    let bottomOffset: number;
    let moveDistance: number;
    let hintBottomOffset: number;

    if (width >= 1920) {
      containerSize = 140; bottomOffset = 120; moveDistance = 100; hintBottomOffset = 280;
    } else if (width >= 1440) {
      containerSize = 120; bottomOffset = 100; moveDistance = 90; hintBottomOffset = 240;
    } else if (width >= 1024) {
      containerSize = 110; bottomOffset = 100; moveDistance = 80; hintBottomOffset = 230;
    } else if (width >= 768) {
      containerSize = 100; bottomOffset = 100; moveDistance = 70; hintBottomOffset = 220;
    } else if (width >= 576) {
      containerSize = 90; bottomOffset = 90; moveDistance = 60; hintBottomOffset = 200;
    } else if (width >= 425) {
      containerSize = 80; bottomOffset = 80; moveDistance = 50; hintBottomOffset = 180;
    } else {
      containerSize = 70; bottomOffset = 70; moveDistance = 40; hintBottomOffset = 160;
    }

    if (height < 500 && width > height) {
      containerSize = Math.min(containerSize, 70);
      bottomOffset = 50;
      moveDistance = Math.min(moveDistance, 40);
      hintBottomOffset = 140;
    }

    this.swipeHandContainer.style.cssText = `
      position: fixed;
      bottom: ${bottomOffset}px;
      left: 50%;
      transform: translateX(calc(-50% - ${this.handPosition}px));
      width: ${containerSize}px;
      height: ${containerSize}px;
      z-index: 999;
      pointer-events: none;
      opacity: ${this.swipeHandContainer.style.opacity || '0'};
      transition: opacity 0.5s ease, transform 0.1s linear;
    `;

    this.swipeHandElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4));
    `;

    if (this.swipeHintContainer) {
      this.swipeHintContainer.style.cssText = `
        position: fixed;
        bottom: ${hintBottomOffset}px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 998;
        pointer-events: none;
        opacity: ${this.swipeHintContainer.style.opacity || '0'};
        transition: opacity 0.5s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: ${Math.max(8, 12 * baseScale)}px;
        width: 90vw;
        max-width: 800px;
      `;
    }

    if (this.topHintElement) {
      const topFontSize = Math.max(14, Math.min(40, 28 * baseScale));
      const topLetterSpacing = Math.max(1, 2 * baseScale);
      const isSmallScreen = width < 576;
      this.topHintElement.style.cssText = `
        font-family: 'Arial', sans-serif;
        font-size: ${topFontSize}px;
        font-weight: 700;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4);
        letter-spacing: ${topLetterSpacing}px;
        padding: ${4 * baseScale}px ${8 * baseScale}px;
        white-space: ${isSmallScreen ? 'normal' : 'nowrap'};
        display: flex;
        gap: ${8 * baseScale}px;
        align-items: center;
        justify-content: center;
        flex-wrap: ${isSmallScreen ? 'wrap' : 'nowrap'};
        line-height: 1.2;
        width: 100%;
      `;

      const spans = this.topHintElement.querySelectorAll('span');
      spans.forEach(span => {
        (span as HTMLElement).style.fontSize = `${topFontSize}px`;
        (span as HTMLElement).style.lineHeight = '1.2';
      });
    }

    if (this.swipeTextElement) {
      const swipeFontSize = Math.max(20, Math.min(48, 32 * baseScale));
      const swipePaddingX = Math.max(40, 80 * baseScale);
      const swipeBorderRadius = Math.max(20, 30 * baseScale);
      const isSmallScreen = width < 576;
      this.swipeTextElement.style.cssText = `
        font-family: 'Arial', sans-serif;
        font-size: ${swipeFontSize}px;
        font-weight: 900;
        color: #d35400;
        text-align: center;
        text-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
        letter-spacing: ${3 * baseScale}px;
        padding: ${8 * baseScale}px ${swipePaddingX}px;
        background: linear-gradient(90deg, rgba(241, 196, 15, 0) 0%, rgba(241, 196, 15, 0.6) 20%, rgba(243, 156, 18, 0.8) 50%, rgba(241, 196, 15, 0.6) 80%, rgba(241, 196, 15, 0) 100%);
        border-radius: ${swipeBorderRadius}px;
        border: none;
        box-shadow: none;
        white-space: ${isSmallScreen ? 'normal' : 'nowrap'};
        max-width: 100%;
        line-height: 1.2;
      `;
    }

    (this.swipeHandContainer as any).moveDistance = moveDistance;
  }

  private showSwipeHand(): void {
    if (this.swipeHandContainer && !this.isTutorialVisible && !this.isGameOver && !this.isFinished) {
      this.swipeHandContainer.style.opacity = '1';
      if (this.swipeHintContainer) {
        this.swipeHintContainer.style.opacity = '1';
      }
      this.startHandAnimation();
    }
  }

  private hideSwipeHand(): void {
    if (this.swipeHandContainer) {
      this.swipeHandContainer.style.opacity = '0';
    }
    if (this.swipeHintContainer) {
      this.swipeHintContainer.style.opacity = '0';
    }
    this.stopHandAnimation();
  }

  private startHandAnimation(): void {
    if (this.handAnimationId !== null) return;

    let startTime: number | null = null;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      const moveDistance = (this.swipeHandContainer as any)?.moveDistance || 80;
      this.handPosition = Math.sin(progress * Math.PI) * moveDistance;

      if (this.swipeHandContainer) {
        this.swipeHandContainer.style.transform = `translateX(calc(-50% - ${this.handPosition}px))`;
      }

      if (!this.isTutorialVisible && !this.isGameOver && !this.isFinished) {
        this.handAnimationId = requestAnimationFrame(animate);
      } else {
        this.handAnimationId = null;
      }
    };

    this.handAnimationId = requestAnimationFrame(animate);
  }

  private stopHandAnimation(): void {
    if (this.handAnimationId !== null) {
      cancelAnimationFrame(this.handAnimationId);
      this.handAnimationId = null;
    }
    this.handPosition = 0;
    if (this.swipeHandContainer) {
      this.swipeHandContainer.style.transform = 'translateX(-50%)';
    }
  }

  private updateSwipeHandVisibility(): void {
    if (!this.player || this.isTutorialVisible || this.isGameOver || this.isFinished) {
      this.hideSwipeHand();
      return;
    }

    const isMoving = this.player.isMovingForward();
    if (isMoving) {
      this.lastMoveTime = Date.now();
      this.hideSwipeHand();
    } else {
      const timeSinceLastMove = Date.now() - this.lastMoveTime;
      if (timeSinceLastMove > this.HAND_SHOW_DELAY) {
        this.showSwipeHand();
      }
    }
  }

  private showTutorial(): void {
    this.isTutorialVisible = false;
    this.createSwipeHandHint();
    this.lastMoveTime = Date.now();
  }

  private setupControls(): void {
    let startX = 0;
    const onStart = (x: number) => { startX = x; };
    const onEnd = (x: number) => {
      if (this.isFinished || this.isGameOver) return;
      const diff = x - startX;
      if (Math.abs(diff) > 50) {
        this.player?.startMoving();
        this.playBackgroundMusic();
        if (diff > 0) {
          console.log('👆 Свайп вправо');
          this.player?.moveRight();
        } else {
          console.log('👆 Свайп влево');
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
        this.playBackgroundMusic();
        if (e.key === 'ArrowLeft') {
          console.log('⬅️ Клавиша влево');
          this.player?.moveLeft();
        }
        if (e.key === 'ArrowRight') {
          console.log('➡️ Клавиша вправо');
          this.player?.moveRight();
        }
      }
    });
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
        if (this.stepTimer >= this.STEP_INTERVAL) {
          this.stepTimer = 0;
          this.playStepSound();
        }
      }

      this.updateSwipeHandVisibility();

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

    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const completed = this.activeEffects[i].update(delta);
      if (completed) {
        this.activeEffects.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private handleFinish(): void {
    if (this.isFinished) return;
    this.isFinished = true;

    if (this.player) {
      this.player.stopMoving();
    }

    if (this.world) {
      this.world.clearAllObjects();
    }

    if (this.player && !this.isGameOver) {
      this.player.faceCamera();
      this.playSound('win');
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
      const type = (obj as any).type as string;
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
    const type = (obj as any).type as string;

    switch (type) {
      case 'coin':
        if ((obj as any).isCollected) return;
        this.score += 1;
        obj.visible = false;
        (obj as any).isCollected = true;
        this.updateCoinCounter();
        this.playSound('coin');
        break;

      case 'bomb':
        this.createExplosion(objPos);
        this.playSound('bomb');
        if (this.player) {
          this.player.playFall(() => {
            this.playSound('lose');
            this.endGame(false);
            this.stopBackgroundMusic();
          });
        }
        this.world?.removeObject(obj);
        break;

      case 'gate':
        const gate = (obj as any).gate as Gate;
        if (!gate || gate.isPassed()) return;
        const playerPos = this.player?.getPosition() || new THREE.Vector3();
        const side = playerPos.x < 0 ? 'left' : 'right';
        const modifier = gate.getModifier(side);
        if (modifier) {
          switch (modifier.type) {
            case '+': this.score += modifier.value; break;
            case '-': this.score = Math.max(0, this.score - modifier.value); break;
            case 'x': this.score *= modifier.value; break;
          }
          this.updateCoinCounter();
          this.playSound('gate');
          gate.markAsPassed();
        }
        break;
    }
  }

  private async playSound(name: string): Promise<void> {
    try {
      let audio = this.soundCache.get(name);
      if (!audio) {
        const loader = this.SOUND_LOADERS[name];
        if (!loader) {
          console.warn(`⚠️ Звук "${name}" не найден`);
          return;
        }
        audio = await AssetLoader.loadSound(name, loader);
        this.setupAudio(audio, name);
      }
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.play().catch(err => console.warn(`⚠️ Ошибка воспроизведения ${name}:`, err));
    } catch (err) {
      console.warn(`⚠️ Ошибка в playSound для ${name}:`, err);
    }
  }

  private endGame(success: boolean): void {
    this.isGameOver = true;
    this.stopBackgroundMusic();
    if (success && this.player) {
      this.player.faceCamera();
    }
    setTimeout(() => this.showEndCard(success), success ? 1500 : 500);
  }

  private showEndCard(isWin: boolean): void {
    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Poppins:wght@400;600;700&family=Bangers&family=Creepster&display=swap';
      document.head.appendChild(fontLink);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height && height < 500;

    let mainFontSize: string, mainLetterSpacing: string, mainMargin: string;
    let subFontSize: string, subLetterSpacing: string, subMargin: string;
    let coinIconSize: string, coinFontSize: string, coinPadding: string, coinGap: string;
    let downloadPadding: string, downloadFontSize: string, downloadLetterSpacing: string;
    let retryPadding: string, retryFontSize: string, retryLetterSpacing: string;
    let topMargin: string, bottomMargin: string, overlayPadding: string;

    const mainColor = '#9b59b6';
    const subColor = isWin ? '#2ed573' : '#e67e22';
    const mainText = isWin ? 'LEVEL COMPLETE!' : 'UNLUCKY';
    const subText = isWin ? '' : 'TRY AGAIN?';

    if (width >= 1920) {
      mainFontSize = '96px'; mainLetterSpacing = '8px'; mainMargin = '0 0 15px 0';
      subFontSize = '72px'; subLetterSpacing = '6px'; subMargin = '0';
      coinIconSize = '60px'; coinFontSize = '48px'; coinPadding = '20px 40px'; coinGap = '15px';
      downloadPadding = '22px 60px'; downloadFontSize = '26px'; downloadLetterSpacing = '3px';
      retryPadding = '18px 50px'; retryFontSize = '22px'; retryLetterSpacing = '2px';
      topMargin = '40px'; bottomMargin = '40px'; overlayPadding = '60px 20px';
    } else if (width >= 1440) {
      mainFontSize = '80px'; mainLetterSpacing = '7px'; mainMargin = '0 0 12px 0';
      subFontSize = '60px'; subLetterSpacing = '5px'; subMargin = '0';
      coinIconSize = '50px'; coinFontSize = '40px'; coinPadding = '18px 35px'; coinGap = '12px';
      downloadPadding = '20px 50px'; downloadFontSize = '24px'; downloadLetterSpacing = '3px';
      retryPadding = '16px 45px'; retryFontSize = '20px'; retryLetterSpacing = '2px';
      topMargin = '35px'; bottomMargin = '35px'; overlayPadding = '50px 20px';
    } else if (width >= 1024) {
      mainFontSize = '72px'; mainLetterSpacing = '6px'; mainMargin = '0 0 10px 0';
      subFontSize = '54px'; subLetterSpacing = '5px'; subMargin = '0';
      coinIconSize = '48px'; coinFontSize = '38px'; coinPadding = '16px 32px'; coinGap = '12px';
      downloadPadding = '18px 48px'; downloadFontSize = '22px'; downloadLetterSpacing = '2px';
      retryPadding = '15px 42px'; retryFontSize = '19px'; retryLetterSpacing = '2px';
      topMargin = '30px'; bottomMargin = '30px'; overlayPadding = '45px 20px';
    } else if (width >= 768) {
      mainFontSize = '64px'; mainLetterSpacing = '5px'; mainMargin = '0 0 10px 0';
      subFontSize = '48px'; subLetterSpacing = '4px'; subMargin = '0';
      coinIconSize = '44px'; coinFontSize = '34px'; coinPadding = '14px 28px'; coinGap = '10px';
      downloadPadding = '16px 42px'; downloadFontSize = '20px'; downloadLetterSpacing = '2px';
      retryPadding = '14px 38px'; retryFontSize = '18px'; retryLetterSpacing = '2px';
      topMargin = '28px'; bottomMargin = '28px'; overlayPadding = '40px 20px';
    } else if (width >= 576) {
      mainFontSize = '56px'; mainLetterSpacing = '5px'; mainMargin = '0 0 8px 0';
      subFontSize = '42px'; subLetterSpacing = '4px'; subMargin = '0';
      coinIconSize = '40px'; coinFontSize = '30px'; coinPadding = '12px 24px'; coinGap = '10px';
      downloadPadding = '14px 38px'; downloadFontSize = '18px'; downloadLetterSpacing = '2px';
      retryPadding = '12px 34px'; retryFontSize = '16px'; retryLetterSpacing = '1px';
      topMargin = '24px'; bottomMargin = '24px'; overlayPadding = '35px 15px';
    } else if (width >= 472) {
      mainFontSize = '44px'; mainLetterSpacing = '3px'; mainMargin = '0 0 8px 0';
      subFontSize = '32px'; subLetterSpacing = '2px'; subMargin = '0';
      coinIconSize = '34px'; coinFontSize = '24px'; coinPadding = '10px 18px'; coinGap = '8px';
      downloadPadding = '12px 30px'; downloadFontSize = '15px'; downloadLetterSpacing = '1px';
      retryPadding = '10px 26px'; retryFontSize = '13px'; retryLetterSpacing = '1px';
      topMargin = '20px'; bottomMargin = '20px'; overlayPadding = '30px 12px';
    } else if (width >= 425) {
      mainFontSize = '38px'; mainLetterSpacing = '2px'; mainMargin = '0 0 6px 0';
      subFontSize = '28px'; subLetterSpacing = '2px'; subMargin = '0';
      coinIconSize = '30px'; coinFontSize = '20px'; coinPadding = '8px 16px'; coinGap = '8px';
      downloadPadding = '10px 26px'; downloadFontSize = '14px'; downloadLetterSpacing = '1px';
      retryPadding = '8px 22px'; retryFontSize = '12px'; retryLetterSpacing = '1px';
      topMargin = '16px'; bottomMargin = '16px'; overlayPadding = '25px 10px';
    } else {
      mainFontSize = '32px'; mainLetterSpacing = '2px'; mainMargin = '0 0 5px 0';
      subFontSize = '24px'; subLetterSpacing = '1px'; subMargin = '0';
      coinIconSize = '28px'; coinFontSize = '18px'; coinPadding = '8px 14px'; coinGap = '6px';
      downloadPadding = '10px 22px'; downloadFontSize = '13px'; downloadLetterSpacing = '1px';
      retryPadding = '8px 20px'; retryFontSize = '11px'; retryLetterSpacing = '1px';
      topMargin = '14px'; bottomMargin = '14px'; overlayPadding = '20px 10px';
    }

    if (isLandscape) {
      mainFontSize = width >= 768 ? mainFontSize : '28px';
      subFontSize = width >= 768 ? subFontSize : '22px';
      coinIconSize = width >= 768 ? coinIconSize : '26px';
      coinFontSize = width >= 768 ? coinFontSize : '16px';
      downloadPadding = width >= 768 ? downloadPadding : '8px 18px';
      downloadFontSize = width >= 768 ? downloadFontSize : '12px';
      retryPadding = width >= 768 ? retryPadding : '6px 16px';
      retryFontSize = width >= 768 ? retryFontSize : '10px';
      overlayPadding = '18px 8px';
      topMargin = '12px';
      bottomMargin = '12px';
    }

    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: ${overlayPadding};
      box-sizing: border-box;
      z-index: 2000;
      pointer-events: auto;
      overflow: auto;
    `;

    const topSection = document.createElement('div');
    topSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: ${topMargin};
      width: 100%;
    `;

    const mainTextElement = document.createElement('h1');
    mainTextElement.textContent = mainText;
    mainTextElement.style.cssText = `
      font-size: ${mainFontSize};
      font-weight: 900;
      color: ${mainColor};
      margin: ${mainMargin};
      font-family: 'Bangers', cursive;
      letter-spacing: ${mainLetterSpacing};
      text-transform: uppercase;
      line-height: 1.1;
      width: 100%;
      text-align: center;
      text-shadow:
        -2px -2px 0 #ffffff,
        2px -2px 0 #ffffff,
        -2px 2px 0 #ffffff,
        2px 2px 0 #ffffff;
      word-wrap: break-word;
    `;
    topSection.appendChild(mainTextElement);

    if (subText) {
      const subTextElement = document.createElement('h2');
      subTextElement.textContent = subText;
      subTextElement.style.cssText = `
        font-size: ${subFontSize};
        font-weight: 800;
        color: ${subColor};
        margin: ${subMargin};
        font-family: 'Creepster', cursive;
        letter-spacing: ${subLetterSpacing};
        text-transform: uppercase;
        line-height: 1.1;
        width: 100%;
        text-align: center;
        text-shadow:
          -2px -2px 0 #ffffff,
          2px -2px 0 #ffffff,
          -2px 2px 0 #ffffff,
          2px 2px 0 #ffffff;
        word-wrap: break-word;
      `;
      topSection.appendChild(subTextElement);
    }

    const middleSection = document.createElement('div');
    middleSection.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: ${coinGap};
      margin: 30px 0;
      padding: ${coinPadding};
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    `;

    const coinIcon = document.createElement('img');
    coinIcon.src = coinTextureUrl;
    coinIcon.alt = 'coin';
    coinIcon.draggable = false;
    coinIcon.style.cssText = `
      width: ${coinIconSize};
      height: ${coinIconSize};
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6));
    `;

    const coinCount = document.createElement('span');
    coinCount.textContent = `${this.score}`;
    coinCount.style.cssText = `
      font-size: ${coinFontSize};
      font-weight: 700;
      color: #ffd700;
      font-family: 'Poppins', sans-serif;
      text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.6);
    `;

    middleSection.appendChild(coinIcon);
    middleSection.appendChild(coinCount);

    const bottomSection = document.createElement('div');
    bottomSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: ${bottomMargin};
      gap: 20px;
      width: 100%;
    `;

    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'download-btn';
    downloadBtn.textContent = 'DOWNLOAD';
    downloadBtn.style.cssText = `
      padding: ${downloadPadding};
      font-size: ${downloadFontSize};
      font-weight: 700;
      background: linear-gradient(135deg, #7bed9f, #2ed573);
      border: 3px solid #ffffff;
      border-radius: 50px;
      color: white;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(46, 213, 115, 0.5);
      transition: all 0.3s ease;
      font-family: 'Poppins', sans-serif;
      letter-spacing: ${downloadLetterSpacing};
      text-transform: uppercase;
      white-space: nowrap;
      max-width: 100%;
    `;

    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.id = 'retry-btn';
    tryAgainBtn.textContent = isWin ? 'PLAY AGAIN' : 'TRY AGAIN';
    tryAgainBtn.style.cssText = `
      padding: ${retryPadding};
      font-size: ${retryFontSize};
      font-weight: 700;
      background: transparent;
      border: 3px solid rgba(255, 255, 255, 0.5);
      border-radius: 30px;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Poppins', sans-serif;
      letter-spacing: ${retryLetterSpacing};
      text-transform: uppercase;
      text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.6);
      white-space: nowrap;
      max-width: 100%;
    `;

    downloadBtn.addEventListener('mouseenter', () => {
      downloadBtn.style.transform = 'scale(1.08)';
      downloadBtn.style.boxShadow = '0 12px 35px rgba(46, 213, 115, 0.7)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
      downloadBtn.style.transform = 'scale(1)';
      downloadBtn.style.boxShadow = '0 8px 25px rgba(46, 213, 115, 0.5)';
    });

    tryAgainBtn.addEventListener('mouseenter', () => {
      tryAgainBtn.style.transform = 'scale(1.08)';
      tryAgainBtn.style.color = '#ffd700';
      tryAgainBtn.style.borderColor = '#ffd700';
    });
    tryAgainBtn.addEventListener('mouseleave', () => {
      tryAgainBtn.style.transform = 'scale(1)';
      tryAgainBtn.style.color = '#ffffff';
      tryAgainBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });

    bottomSection.appendChild(downloadBtn);
    bottomSection.appendChild(tryAgainBtn);

    overlay.appendChild(topSection);
    overlay.appendChild(middleSection);
    overlay.appendChild(bottomSection);
    document.body.appendChild(overlay);

    document.getElementById('download-btn')?.addEventListener('click', () => {
      window.open('https://example.com/download', '_blank');
    });
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      location.reload();
    });

    overlay.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    });
    overlay.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  }

  getScore(): number {
    return this.score;
  }

  onResize(): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.updateCoinCounterStyles();
    this.updateMusicButtonStyles();
    this.updateSwipeHandStyles();
  }
}
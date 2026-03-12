import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// 🔥 МОДЕЛИ И АНИМАЦИИ — СТАТИЧЕСКИЕ ИМПОРТЫ (критично для работы!)
import characterModelUrl from '../assets/models/Character.fbx?url';
import runningAnimUrl from '../assets/models/Running.fbx?url';
import gameOverAnimUrl from '../assets/models/Game_over.fbx?url';
import breakdanceAnimUrl from '../assets/models/Breakdance.fbx?url';
import textureAtlasUrl from '../assets/textures/Polygon_City_Characters_Texture_01_A.webp';

export type CharacterSkin =
  | 'Character_Jock' | 'Character_Grandma' | 'Character_ShopKeeper'
  | 'Character_SummerGirl' | 'Character_Hobo' | 'Character_HipsterGirl'
  | 'Character_FastFoodGuy' | 'Character_HipsterGuy' | 'Character_Roadworker'
  | 'Character_Gangster' | 'Character_Biker' | 'Character_FireFighter'
  | 'Character_PunkGuy' | 'Character_Grandpa' | 'Character_Tourist'
  | 'Character_Hotdog' | 'Character_PunkGirl' | 'Character_Paramedic'
  | 'Character_GamerGirl' | 'ALL';

export type PlayerState = 'idle' | 'running' | 'falling' | 'dancing' | 'breakdance' | 'finished';

export class Player {
  private mesh: THREE.Group;
  private currentLane = 0;
  private readonly LANE_WIDTH = 1.8;
  private readonly FORWARD_SPEED = 0.15;
  private readonly MOVE_LERP = 0.15;

  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentState: PlayerState = 'idle';
  private isMoving = false;

  // 🔥 Таймеры — используются в stopAllAnimations()
  private fallTimer: number | null = null;
  private danceTimer: number | null = null;
  
  private onFallComplete?: () => void;
  private onDanceComplete?: () => void;

  private atlasTexture: THREE.Texture | null = null;
  private currentSkin: CharacterSkin = 'Character_Hotdog';
  private characterMeshes: Map<string, THREE.Mesh> = new Map();

  constructor(skin: CharacterSkin = 'Character_Hotdog') {
    this.mesh = new THREE.Group();
    this.currentSkin = skin;
    
    this.loadAssets(() => {
      console.log('🎮 Персонаж полностью загружен!');
      this.setSkin(this.currentSkin);
      setTimeout(() => {
        console.log('▶️ Запуск idle анимации');
        this.playAnimation('idle');
      }, 500);
    });
  }

  private loadAssets(onComplete: () => void): void {
    this.loadAtlas(() => {
      this.loadCharacterModel(() => {
        this.loadMixamoAnimations(() => {
          onComplete();
        });
      });
    });
  }

  private loadAtlas(onReady: () => void): void {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      textureAtlasUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = 16;
        texture.flipY = true;
        texture.needsUpdate = true;
        this.atlasTexture = texture;
        console.log('✅ Текстура атласа загружена');
        onReady();
      },
      undefined,
      () => {
        console.warn('⚠️ Текстура не загружена');
        onReady();
      }
    );
  }

  private loadCharacterModel(onReady: () => void): void {
    const loader = new FBXLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      characterModelUrl,
      (object: THREE.Object3D) => {
        console.log('✅ Базовая модель загружена');
        const model = object;
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name) {
            this.characterMeshes.set(child.name, child);
          }
        });

        if (this.atlasTexture) {
          this.applyTextureToModel(model);
        }

        this.mesh.add(model);
        this.mesh.position.set(0, 0.75, 0);

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.y > 0.1) {
          const scale = 2.5 / size.y;
          this.mesh.scale.setScalar(scale);
        }

        this.mixer = new THREE.AnimationMixer(model);
        onReady();
      },
      undefined,
      (err) => {
        console.error('❌ Ошибка загрузки модели:', err);
        this.createPlaceholderCube();
        onReady();
      }
    );
  }

  private applyTextureToModel(object: THREE.Object3D): void {
    let texturedMeshes = 0;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.geometry.attributes.uv) {
          console.warn(`  ⚠️ Нет UV у ${child.name}`);
          return;
        }
        const material = new THREE.MeshStandardMaterial({
          map: this.atlasTexture!,
          color: 0xffffff,
          roughness: 0.5,
          metalness: 0.1,
          emissive: 0x222222,
          emissiveIntensity: 0.3,
          side: THREE.FrontSide
        });
        material.needsUpdate = true;
        if (material.map) {
          material.map.needsUpdate = true;
          material.map.colorSpace = THREE.SRGBColorSpace;
        }
        child.material = material;
        texturedMeshes++;
      }
    });
    console.log(`🎨 Текстура применена к ${texturedMeshes} мешам`);
  }

  private loadMixamoAnimations(onReady: () => void): void {
    if (!this.mixer) {
      console.error('❌ Микшер не инициализирован!');
      onReady();
      return;
    }

    const loader = new FBXLoader();
    loader.crossOrigin = 'anonymous';
    
    const animationsToLoad = [
      { path: runningAnimUrl, name: 'run' },
      { path: gameOverAnimUrl, name: 'fall' },
      { path: breakdanceAnimUrl, name: 'breakdance' }
    ];

    let loaded = 0;
    const total = animationsToLoad.length;

    const checkDone = () => {
      if (++loaded >= total) {
        if (!this.actions.has('idle')) {
          this.createIdleAnimation();
        }
        onReady();
      }
    };

    animationsToLoad.forEach(({ path, name }) => {
      loader.load(
        path,
        (object: THREE.Object3D) => {
          if (object.animations && object.animations.length > 0) {
            let clip = object.animations.find(clip => clip.duration > 0.5);
            if (!clip && object.animations.length > 0) {
              clip = object.animations[0];
            }
            if (clip) {
              const clonedClip = clip.clone();
              clonedClip.name = name;
              const action = this.mixer!.clipAction(clonedClip);
              
              if (name === 'fall' || name === 'breakdance') {
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
              } else {
                action.loop = THREE.LoopRepeat;
              }
              
              this.actions.set(name, action);
            }
          }
          
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m?.dispose());
              } else {
                child.material?.dispose();
              }
            }
          });
          checkDone();
        },
        undefined,
        (err) => {
          console.warn(`⚠️ Не удалось загрузить ${name}:`, err);
          checkDone();
        }
      );
    });
  }

  private createIdleAnimation(): void {
    if (!this.mixer) return;
    const times = [0, 1, 2];
    const posY = [0, 0.03, 0];
    const rotY = [0, 0.05, 0];
    const positionTrack = new THREE.VectorKeyframeTrack('.position[y]', times, posY);
    const rotationTrack = new THREE.VectorKeyframeTrack('.rotation[y]', times, rotY);
    const clip = new THREE.AnimationClip('idle', 2, [positionTrack, rotationTrack]);
    const action = this.mixer.clipAction(clip);
    action.loop = THREE.LoopRepeat;
    this.actions.set('idle', action);
  }

  private playAnimation(name: string, fadeIn: number = 0.2): void {
    const newAction = this.actions.get(name);
    if (!newAction) {
      console.warn(`⚠️ Анимация "${name}" не найдена!`);
      return;
    }
    this.actions.forEach((action) => {
      if (action.isRunning()) {
        action.fadeOut(fadeIn);
      }
    });
    newAction.reset();
    newAction.fadeIn(fadeIn);
    newAction.play();
    this.currentState = name as PlayerState;
  }

  startRunning(): void {
    if (this.currentState !== 'running') {
      this.playAnimation('run');
    }
  }

  startMoving(): void {
    if (!this.isMoving) {
      this.isMoving = true;
      this.startRunning();
    }
  }

  stopMoving(): void {
    this.isMoving = false;
  }

  isMovingForward(): boolean {
    return this.isMoving;
  }

  playFall(onComplete?: () => void): void {
    this.onFallComplete = onComplete;
    this.currentState = 'falling';
    this.isMoving = false;
    const fallAction = this.actions.get('fall');
    if (fallAction) {
      fallAction.time = 0;
      fallAction.reset();
      this.playAnimation('fall', 0.1);
      let fallDuration = fallAction.getClip()?.duration || 1.5;
      this.fallTimer = window.setTimeout(() => {
        this.fallTimer = null;
        if (this.onFallComplete) this.onFallComplete();
      }, fallDuration * 1000);
    } else {
      setTimeout(() => { if (this.onFallComplete) this.onFallComplete(); }, 800);
    }
  }

  playBreakdance(onComplete?: () => void): void {
    if (this.danceTimer) {
      clearTimeout(this.danceTimer);
      this.danceTimer = null;
    }
    this.onDanceComplete = onComplete;
    this.currentState = 'breakdance';
    this.isMoving = false;
    const danceAction = this.actions.get('breakdance');
    if (danceAction) {
      danceAction.time = 0;
      danceAction.reset();
      this.playAnimation('breakdance', 0.3);
      let danceDuration = danceAction.getClip()?.duration || 3.5;
      const totalWaitTime = (danceDuration * 1000) + 500;
      this.danceTimer = window.setTimeout(() => {
        this.danceTimer = null;
        if (this.onDanceComplete) this.onDanceComplete();
      }, totalWaitTime);
    } else {
      setTimeout(() => { if (this.onDanceComplete) this.onDanceComplete(); }, 4000);
    }
  }

  faceCamera(): void {
    this.mesh.rotation.y = Math.PI;
  }

  // 🔥 ДОБАВЛЕНО: Метод очистки таймеров (убирает предупреждения TS)
  stopAllAnimations(): void {
    if (this.fallTimer !== null) {
      clearTimeout(this.fallTimer);
      this.fallTimer = null;
    }
    if (this.danceTimer !== null) {
      clearTimeout(this.danceTimer);
      this.danceTimer = null;
    }
    this.actions.forEach(action => {
      action.stop();
    });
  }

  /**
   * ИСПРАВЛЕНО: Инвертировано управление для соответствия камере
   * При нажатии кнопки влево персонаж движется вправо (на экране)
   * При нажатии кнопки вправо персонаж движется влево (на экране)
   */
  moveLeft(): void {
    // При нажатии кнопки влево - движемся вправо (увеличиваем X)
    if (this.currentLane < 1) {
      this.currentLane++;
      console.log(`⬅️ Нажата кнопка ВЛЕВО -> персонаж движется ВПРАВО, полоса: ${this.currentLane}, X цель: ${this.currentLane * this.LANE_WIDTH}`);
    }
  }

  moveRight(): void {
    // При нажатии кнопки вправо - движемся влево (уменьшаем X)
    if (this.currentLane > -1) {
      this.currentLane--;
      console.log(`➡️ Нажата кнопка ВПРАВО -> персонаж движется ВЛЕВО, полоса: ${this.currentLane}, X цель: ${this.currentLane * this.LANE_WIDTH}`);
    }
  }

  update(delta: number): void {
    if (this.mixer) this.mixer.update(delta);
    
    if (this.isMoving && this.currentState !== 'falling' && this.currentState !== 'breakdance' && this.currentState !== 'dancing') {
      this.mesh.position.z += this.FORWARD_SPEED * 60 * delta;
    }
    
    // Рассчитываем целевую X координату
    const targetX = this.currentLane * this.LANE_WIDTH;
    
    // Плавно перемещаемся к целевой позиции
    this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, this.MOVE_LERP);
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  getState(): PlayerState {
    return this.currentState;
  }

  // 🔥 ИСПРАВЛЕНО: Корректная проверка видимости скина
  setSkin(skin: CharacterSkin): void {
    this.currentSkin = skin;
    this.characterMeshes.forEach((mesh, name) => {
      mesh.visible = (this.currentSkin === 'ALL' || name === this.currentSkin);
    });
  }

  getAvailableSkins(): CharacterSkin[] {
    return Array.from(this.characterMeshes.keys()) as CharacterSkin[];
  }

  getCurrentSkin(): CharacterSkin {
    return this.currentSkin;
  }

  private createPlaceholderCube(): void {
    const geo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4ecca3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.0, 0);
    mesh.castShadow = true;
    this.mesh.add(mesh);
  }
}
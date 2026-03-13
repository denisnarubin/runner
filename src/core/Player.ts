import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { CharacterSkin, PlayerState, AnimationToLoad } from '../types/types';
import characterModelUrl from '../assets/models/Character.fbx?url';
import runningAnimUrl from '../assets/models/Running.fbx?url';
import gameOverAnimUrl from '../assets/models/Game_over.fbx?url';
import breakdanceAnimUrl from '../assets/models/Breakdance.fbx?url';
import textureAtlasUrl from '../assets/textures/Polygon_City_Characters_Texture_01_A.webp';



export class Player {
  private mesh: THREE.Group;
  private currentLane: number = 0;
  private readonly LANE_WIDTH: number = 1.8;
  private readonly FORWARD_SPEED: number = 0.15;
  private readonly MOVE_LERP: number = 0.15;

  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentState: PlayerState = 'idle';
  private isMoving: boolean = false;

  private fallTimer: number | null = null;
  private danceTimer: number | null = null;
  
  private onFallComplete?: () => void;
  private onDanceComplete?: () => void;

  private atlasTexture: THREE.Texture | null = null;
  private currentSkin: CharacterSkin;
  private characterMeshes: Map<string, THREE.Mesh> = new Map();

  constructor(skin: CharacterSkin = 'Character_Hotdog') {
    this.mesh = new THREE.Group();
    this.currentSkin = skin;
    
    this.loadAssets((): void => {
      this.setSkin(this.currentSkin);
      setTimeout((): void => {
        this.playAnimation('idle');
      }, 500);
    });
  }

  private loadAssets(onComplete: () => void): void {
    this.loadAtlas((): void => {
      this.loadCharacterModel((): void => {
        this.loadMixamoAnimations((): void => {
          onComplete();
        });
      });
    });
  }

  private loadAtlas(onReady: () => void): void {
    const loader: THREE.TextureLoader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      textureAtlasUrl,
      (texture: THREE.Texture): void => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = 16;
        texture.flipY = true;
        texture.needsUpdate = true;
        this.atlasTexture = texture;
        onReady();
      },
      undefined,
      (): void => {
        onReady();
      }
    );
  }

  private loadCharacterModel(onReady: () => void): void {
    const loader: FBXLoader = new FBXLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      characterModelUrl,
      (object: THREE.Object3D): void => {
        object.traverse((child: THREE.Object3D): void => {
          if (child instanceof THREE.Mesh && child.name) {
            this.characterMeshes.set(child.name, child);
          }
        });

        if (this.atlasTexture) {
          this.applyTextureToModel(object);
        }

        this.mesh.add(object);
        this.mesh.position.set(0, 0.75, 0);

        const box: THREE.Box3 = new THREE.Box3().setFromObject(object);
        const size: THREE.Vector3 = new THREE.Vector3();
        box.getSize(size);
        if (size.y > 0.1) {
          const scale: number = 2.5 / size.y;
          this.mesh.scale.setScalar(scale);
        }

        this.mixer = new THREE.AnimationMixer(object);
        onReady();
      },
      undefined,
      (): void => {
        this.createPlaceholderCube();
        onReady();
      }
    );
  }

  private applyTextureToModel(object: THREE.Object3D): void {
    object.traverse((child: THREE.Object3D): void => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.geometry.attributes.uv) {
          return;
        }
        if (!this.atlasTexture) {
          return;
        }
        const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
          map: this.atlasTexture,
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
      }
    });
  }

  private loadMixamoAnimations(onReady: () => void): void {
    if (!this.mixer) {
      onReady();
      return;
    }

    const loader: FBXLoader = new FBXLoader();
    loader.crossOrigin = 'anonymous';
    
    const animationsToLoad: AnimationToLoad[] = [
      { path: runningAnimUrl, name: 'run' },
      { path: gameOverAnimUrl, name: 'fall' },
      { path: breakdanceAnimUrl, name: 'breakdance' }
    ];

    let loaded: number = 0;
    const total: number = animationsToLoad.length;

    const checkDone = (): void => {
      if (++loaded >= total) {
        if (!this.actions.has('idle')) {
          this.createIdleAnimation();
        }
        onReady();
      }
    };

    animationsToLoad.forEach(({ path, name }: AnimationToLoad): void => {
      loader.load(
        path,
        (object: THREE.Object3D): void => {
          if (object.animations && object.animations.length > 0) {
            let clip: THREE.AnimationClip | undefined = object.animations.find((clip: THREE.AnimationClip): boolean => clip.duration > 0.5);
            if (!clip && object.animations.length > 0) {
              clip = object.animations[0];
            }
            if (clip && this.mixer) {
              const clonedClip: THREE.AnimationClip = clip.clone();
              clonedClip.name = name;
              const action: THREE.AnimationAction = this.mixer.clipAction(clonedClip);
              
              if (name === 'fall' || name === 'breakdance') {
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
              } else {
                action.loop = THREE.LoopRepeat;
              }
              
              this.actions.set(name, action);
            }
          }
          
          object.traverse((child: THREE.Object3D): void => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((m: THREE.Material): void => m?.dispose());
              } else {
                child.material?.dispose();
              }
            }
          });
          checkDone();
        },
        undefined,
        (): void => {
          checkDone();
        }
      );
    });
  }

  private createIdleAnimation(): void {
    if (!this.mixer) return;
    const times: number[] = [0, 1, 2];
    const posY: number[] = [0, 0.03, 0];
    const rotY: number[] = [0, 0.05, 0];
    
    const positionTrack: THREE.VectorKeyframeTrack = new THREE.VectorKeyframeTrack('.position[y]', times, posY);
    const rotationTrack: THREE.VectorKeyframeTrack = new THREE.VectorKeyframeTrack('.rotation[y]', times, rotY);
    
    const clip: THREE.AnimationClip = new THREE.AnimationClip('idle', 2, [positionTrack, rotationTrack]);
    const action: THREE.AnimationAction = this.mixer.clipAction(clip);
    action.loop = THREE.LoopRepeat;
    this.actions.set('idle', action);
  }

  private playAnimation(name: string, fadeIn: number = 0.2): void {
    const newAction: THREE.AnimationAction | undefined = this.actions.get(name);
    if (!newAction) {
      return;
    }
    this.actions.forEach((action: THREE.AnimationAction): void => {
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
    const fallAction: THREE.AnimationAction | undefined = this.actions.get('fall');
    if (fallAction) {
      fallAction.time = 0;
      fallAction.reset();
      this.playAnimation('fall', 0.1);
      const fallDuration: number = fallAction.getClip()?.duration || 1.5;
      this.fallTimer = window.setTimeout((): void => {
        this.fallTimer = null;
        if (this.onFallComplete) this.onFallComplete();
      }, fallDuration * 1000);
    } else {
      setTimeout((): void => { if (this.onFallComplete) this.onFallComplete(); }, 800);
    }
  }

  playBreakdance(onComplete?: () => void): void {
    if (this.danceTimer !== null) {
      clearTimeout(this.danceTimer);
      this.danceTimer = null;
    }
    this.onDanceComplete = onComplete;
    this.currentState = 'breakdance';
    this.isMoving = false;
    const danceAction: THREE.AnimationAction | undefined = this.actions.get('breakdance');
    if (danceAction) {
      danceAction.time = 0;
      danceAction.reset();
      this.playAnimation('breakdance', 0.3);
      const danceDuration: number = danceAction.getClip()?.duration || 3.5;
      const totalWaitTime: number = (danceDuration * 1000) + 500;
      this.danceTimer = window.setTimeout((): void => {
        this.danceTimer = null;
        if (this.onDanceComplete) this.onDanceComplete();
      }, totalWaitTime);
    } else {
      setTimeout((): void => { if (this.onDanceComplete) this.onDanceComplete(); }, 4000);
    }
  }

  faceCamera(): void {
    this.mesh.rotation.y = Math.PI;
  }

  stopAllAnimations(): void {
    if (this.fallTimer !== null) {
      clearTimeout(this.fallTimer);
      this.fallTimer = null;
    }
    if (this.danceTimer !== null) {
      clearTimeout(this.danceTimer);
      this.danceTimer = null;
    }
    this.actions.forEach((action: THREE.AnimationAction): void => {
      action.stop();
    });
  }

  moveLeft(): void {
    if (this.currentLane < 1) {
      this.currentLane++;
    }
  }

  moveRight(): void {
    if (this.currentLane > -1) {
      this.currentLane--;
    }
  }

  update(delta: number): void {
    if (this.mixer) this.mixer.update(delta);
    
    if (this.isMoving && this.currentState !== 'falling' && this.currentState !== 'breakdance' && this.currentState !== 'dancing') {
      this.mesh.position.z += this.FORWARD_SPEED * 60 * delta;
    }
    
    const targetX: number = this.currentLane * this.LANE_WIDTH;
    
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

  setSkin(skin: CharacterSkin): void {
    this.currentSkin = skin;
    this.characterMeshes.forEach((mesh: THREE.Mesh, name: string): void => {
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
    const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({ color: 0x4ecca3 });
    const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 1.0, 0);
    mesh.castShadow = true;
    this.mesh.add(mesh);
  }
}
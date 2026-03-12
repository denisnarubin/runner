import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Gate } from './Gate';
import type { GatePairLayout } from './Gate';

import coinModelUrl from '../assets/models/Coin_Reskin.fbx?url';
import bombModelUrl from '../assets/models/tnt_barrel_large.fbx?url';
import coinTextureUrl from '../assets/textures/coin.png?url';
import explosivesTextureUrl from '../assets/textures/explosives_texture.webp?url';
import explosivesRoughUrl from '../assets/textures/explosives_rough.png?url';

type ObjectWithType = THREE.Object3D & {
  type?: 'coin' | 'bomb' | 'gate';
  scoreValue?: number;
  initialRotation?: number;
  isCollected?: boolean;
  visible?: boolean;
  gate?: Gate;
};

type Position2D = {
  lane: number;
  z: number;
};

type SpawnCounts = {
  coins: number;
  bombs: number;
  gates: number;
};

export class World {
  private scene: THREE.Scene;
  private chunks: THREE.Group[] = [];
  private chunkLength: number = 20;
  private laneWidth: number = 1.8;
  private lastChunkZ: number = 0;
  private readonly CHUNK_SPAWN_DISTANCE: number = 200;
  private readonly CHUNK_REMOVE_DISTANCE: number = 180;
  private readonly MAX_CHUNKS: number = 50;
  private readonly INITIAL_CHUNKS: number = 25;
  private readonly MAX_BOMBS_PER_CHUNK: number = 2;
  private readonly MIN_SAFE_DISTANCE_BOMB: number = 2.5;
  private readonly MIN_DISTANCE_COIN_BOMB: number = 1.2;
  private readonly BOMB_SPAWN_CHANCE: number = 0.5;
  private readonly SAFE_START_ZONE: number = 40;
  private readonly COINS_PER_ROW: number = 5;
  private readonly CHANCE_FOR_1_ROW: number = 0.4;
  private readonly CHANCE_FOR_2_ROWS: number = 0.4;
  private readonly GATE_SPAWN_CHANCE: number = 0.15;
  private readonly MIN_DISTANCE_FROM_BOMB: number = 3.0;
  private currentGateLayout: GatePairLayout = 'plus-left';
  private bombModel: THREE.Object3D | null = null;
  private coinModel: THREE.Object3D | null = null;
  private _respawnDone: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < this.INITIAL_CHUNKS; i++) {
      const zPos: number = i * this.chunkLength;
      this.createChunk(zPos);
      this.lastChunkZ = Math.max(this.lastChunkZ, zPos);
    }
    this.chunks.forEach((chunk: THREE.Group): void => { chunk.visible = true; });

    Promise.all([
      new Promise<void>((resolve: () => void): void => this.loadBombModel(() => resolve())),
      new Promise<void>((resolve: () => void): void => this.loadCoinModel(() => resolve()))
    ]).then((): void => {
      setTimeout((): void => {
        if (!this._respawnDone) {
          this.respawnObjectsAfterLoad();
          this._respawnDone = true;
        }
      }, 100);
    });

    const bombLight: THREE.PointLight = new THREE.PointLight(0xff6666, 0.6, 20);
    bombLight.position.set(0, 8, 5);
    this.scene.add(bombLight);

    const roadLight: THREE.PointLight = new THREE.PointLight(0xffffff, 2.0, 100);
    roadLight.position.set(0, 15, 0);
    this.scene.add(roadLight);
  }

  clearAllObjects(): void {
    this.chunks.forEach((chunk: THREE.Group): void => {
      for (let i = chunk.children.length - 1; i >= 0; i--) {
        const child: THREE.Object3D = chunk.children[i];
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'bomb' || typedChild.type === 'coin' || typedChild.type === 'gate') {
          chunk.remove(child);
        }
      }
    });
  }

  private respawnObjectsAfterLoad(): void {
    this.chunks.forEach((chunk: THREE.Group): void => {
      for (let i = chunk.children.length - 1; i >= 0; i--) {
        const child: THREE.Object3D = chunk.children[i];
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'bomb' || typedChild.type === 'coin' || typedChild.type === 'gate') {
          chunk.remove(child);
        }
      }
      this.spawnObjectsInChunk(chunk);
    });
  }

  private loadCoinModel(onReady: () => void): void {
    const loader: FBXLoader = new FBXLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      coinModelUrl,
      (object: THREE.Object3D): void => {
        object.scale.set(0.8, 0.8, 0.8);
        const textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous';
        textureLoader.load(
          coinTextureUrl,
          (texture: THREE.Texture): void => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            object.traverse((child: THREE.Object3D): void => {
              if (child instanceof THREE.Mesh && child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
                  map: texture,
                  color: 0xffffff,
                  emissive: 0xffaa00,
                  emissiveIntensity: 0.4,
                  metalness: 0.9,
                  roughness: 0.1
                });
                child.material = material;
              }
            });
            this.coinModel = object;
            onReady();
          },
          undefined,
          (): void => {
            object.traverse((child: THREE.Object3D): void => {
              if (child instanceof THREE.Mesh && child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
                  color: 0xffd700,
                  emissive: 0xffaa00,
                  emissiveIntensity: 0.5,
                  metalness: 1.0,
                  roughness: 0.0
                });
                child.material = material;
              }
            });
            this.coinModel = object;
            onReady();
          }
        );
      },
      undefined,
      (_: unknown): void => {
        this.coinModel = null;
        onReady();
      }
    );
  }

  private loadBombModel(onReady: () => void): void {
    const loader: FBXLoader = new FBXLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      bombModelUrl,
      (object: THREE.Object3D): void => {
        const box: THREE.Box3 = new THREE.Box3().setFromObject(object);
        const size: THREE.Vector3 = new THREE.Vector3();
        box.getSize(size);
        object.scale.set(0.01, 0.01, 0.01);
        const textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous';
        textureLoader.load(
          explosivesTextureUrl,
          (albedoTexture: THREE.Texture): void => {
            this.setupTexture(albedoTexture, true);
            textureLoader.load(
              explosivesRoughUrl,
              (roughTexture: THREE.Texture): void => {
                this.setupTexture(roughTexture, false);
                this.applyPBRTextures(object, albedoTexture, roughTexture, null);
                this.finalizeBomb(object, onReady);
              },
              undefined,
              (): void => {
                this.applyPBRTextures(object, albedoTexture, null, null);
                this.finalizeBomb(object, onReady);
              }
            );
          },
          undefined,
          (): void => {
            this.applyColorToObject(object, 0xff4444);
            this.bombModel = object;
            onReady();
          }
        );
      },
      undefined,
      (_: unknown): void => {
        this.createFallbackBomb();
        onReady();
      }
    );
  }

  private setupTexture(texture: THREE.Texture, isColor: boolean): void {
    texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 16;
    texture.flipY = true;
    texture.needsUpdate = true;
  }

  private applyPBRTextures(object: THREE.Object3D, albedo: THREE.Texture, roughness: THREE.Texture | null, glow: THREE.Texture | null): void {
    object.traverse((child: THREE.Object3D): void => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
          map: albedo,
          color: 0xffffff,
          roughnessMap: roughness,
          roughness: roughness ? 1.0 : 0.4,
          emissiveMap: glow,
          emissive: glow ? 0xff6600 : 0x221111,
          emissiveIntensity: glow ? 1.0 : 0.4,
          metalness: 0.6,
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
    this.bombModel = object;
  }

  private finalizeBomb(object: THREE.Object3D, onReady: () => void): void {
    this.bombModel = object;
    onReady();
  }

  private applyColorToObject(object: THREE.Object3D, colorHex: number): void {
    object.traverse((child: THREE.Object3D): void => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: 0x661111,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.8
        });
        material.needsUpdate = true;
        child.material = material;
      }
    });
    this.bombModel = object;
  }

  private createFallbackBomb(): void {
    const group: THREE.Group = new THREE.Group();
    const barrelMat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xaa2222,
      emissiveIntensity: 0.6
    });
    const barrelGeo: THREE.CylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16);
    const barrel: THREE.Mesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.castShadow = true;
    group.add(barrel);
    group.scale.set(1, 1, 1);
    this.bombModel = group;
  }

  private canPlaceGate(zOffset: number, bombPositions: Position2D[]): boolean {
    for (const bomb of bombPositions) {
      if (Math.abs(bomb.z - zOffset) < this.MIN_DISTANCE_FROM_BOMB) return false;
    }
    return true;
  }

  private isInSafeStartZone(globalZ: number): boolean {
    return globalZ < this.SAFE_START_ZONE;
  }

  private createChunk(zPosition: number): void {
    const chunk: THREE.Group = new THREE.Group();
    const roadGeo: THREE.PlaneGeometry = new THREE.PlaneGeometry(5.5, this.chunkLength);
    const roadMat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x666666,
      emissiveIntensity: 0.7
    });
    const road: THREE.Mesh = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.01;
    road.receiveShadow = true;
    road.name = 'road';
    chunk.add(road);

    this.spawnObjectsInChunk(chunk);

    chunk.position.z = zPosition;
    chunk.name = `chunk_z${zPosition}`;
    chunk.visible = true;
    this.scene.add(chunk);
    this.chunks.push(chunk);
  }

  private spawnObjectsInChunk(parent: THREE.Group): SpawnCounts {
    let coinCount: number = 0, bombCount: number = 0, gateCount: number = 0;
    const coinPositions: Position2D[] = [];
    const bombPositions: Position2D[] = [];
    const chunkGlobalZ: number = parent.position.z;
    const rand: number = Math.random();

    let rowsOfCoins: number = 1;
    if (rand < this.CHANCE_FOR_1_ROW) {
      rowsOfCoins = 1;
    } else if (rand < this.CHANCE_FOR_1_ROW + this.CHANCE_FOR_2_ROWS) {
      rowsOfCoins = 2;
    } else {
      rowsOfCoins = 3;
    }

    const coinSpacing: number = this.chunkLength / (this.COINS_PER_ROW + 1);
    const availableLanes: number[] = [-1, 0, 1];
    const selectedLanes: number[] = [];

    for (let i = 0; i < rowsOfCoins; i++) {
      if (availableLanes.length === 0) break;
      const randomIndex: number = Math.floor(Math.random() * availableLanes.length);
      const lane: number = availableLanes.splice(randomIndex, 1)[0];
      selectedLanes.push(lane);
    }
    selectedLanes.sort((a: number, b: number): number => a - b);

    for (const lane of selectedLanes) {
      for (let i = 1; i <= this.COINS_PER_ROW; i++) {
        const zOffset: number = i * coinSpacing - this.chunkLength / 2;
        const coin: THREE.Object3D | null = this.spawnCoin(parent, lane, zOffset);
        if (coin) {
          coinPositions.push({ lane, z: zOffset });
          coinCount++;
        }
      }
    }

    if (Math.random() < this.BOMB_SPAWN_CHANCE) {
      const bombsToSpawn: number = Math.floor(Math.random() * this.MAX_BOMBS_PER_CHUNK) + 1;
      for (let b = 0; b < bombsToSpawn; b++) {
        for (let attempt = 0; attempt < 30; attempt++) {
          const lane: number = Math.floor(Math.random() * 3) - 1;
          const zOffset: number = (Math.random() * (this.chunkLength - 6)) + 3 - this.chunkLength / 2;
          const bombGlobalZ: number = chunkGlobalZ + zOffset;

          if (this.isInSafeStartZone(bombGlobalZ)) continue;

          let tooCloseToBomb: boolean = false;
          for (const pos of bombPositions) {
            if (pos.lane === lane && Math.abs(pos.z - zOffset) < this.MIN_SAFE_DISTANCE_BOMB) {
              tooCloseToBomb = true;
              break;
            }
          }
          if (tooCloseToBomb) continue;

          let tooCloseToCoin: boolean = false;
          for (const pos of coinPositions) {
            if (pos.lane === lane && Math.abs(pos.z - zOffset) < this.MIN_DISTANCE_COIN_BOMB) {
              tooCloseToCoin = true;
              break;
            }
          }
          if (tooCloseToCoin) continue;

          if (!this.isPathClear(parent, lane, zOffset)) continue;

          const bomb: THREE.Object3D | null = this.spawnBomb(parent, lane, zOffset);
          if (bomb) {
            bombPositions.push({ lane, z: zOffset });
            bombCount++;
          }
          break;
        }
      }
    }

    if (Math.random() < this.GATE_SPAWN_CHANCE) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const zOffset: number = (Math.random() * (this.chunkLength - 8)) + 4 - this.chunkLength / 2;
        const gateGlobalZ: number = chunkGlobalZ + zOffset;

        if (this.isInSafeStartZone(gateGlobalZ)) continue;

        if (this.canPlaceGate(zOffset, bombPositions)) {
          const modifierTypes: Array<'+' | '-' | 'x'> = ['+', '-', 'x'];
          const randomType = modifierTypes[Math.floor(Math.random() * modifierTypes.length)];
          
          const gate: Gate = new Gate(
            { type: randomType, value: 1 },
            zOffset,
            this.currentGateLayout,
            true
          );
          const gateMesh: THREE.Group = gate.getMesh();
          const typedGateMesh = gateMesh as ObjectWithType;
          typedGateMesh.type = 'gate';
          typedGateMesh.gate = gate;
          parent.add(gateMesh);
          gateCount++;
          this.currentGateLayout = Gate.getNextLayout(this.currentGateLayout);
          break;
        }
      }
    }

    return { coins: coinCount, bombs: bombCount, gates: gateCount };
  }

  private isPathClear(parent: THREE.Group, bombLane: number, bombZ: number): boolean {
    for (let i = 0; i < parent.children.length; i++) {
      const child: THREE.Object3D = parent.children[i];
      const typedChild = child as ObjectWithType;
      if (typedChild.type === 'bomb') {
        const objPos: THREE.Vector3 = child.position;
        const otherLane: number = Math.round(objPos.x / this.laneWidth);
        if (otherLane === bombLane && Math.abs(objPos.z - bombZ) < this.MIN_SAFE_DISTANCE_BOMB) return false;
        if (Math.abs(otherLane - bombLane) === 1 && Math.abs(objPos.z - bombZ) < 1.5) return false;
      }
    }
    return true;
  }

  private spawnCoin(parent: THREE.Group, lane: number, zOffset: number): THREE.Object3D | null {
    if (this.coinModel) {
      const coin: THREE.Object3D = this.coinModel.clone();
      coin.position.set(lane * this.laneWidth, 1.2, zOffset);
      coin.castShadow = true;
      coin.receiveShadow = true;
      const typedCoin = coin as ObjectWithType;
      typedCoin.type = 'coin';
      typedCoin.scoreValue = 1;
      typedCoin.initialRotation = Math.random() * Math.PI * 2;
      typedCoin.isCollected = false;
      typedCoin.visible = true;
      parent.add(coin);
      return coin;
    } else {
      const coinGeo: THREE.CylinderGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
      const coinMat: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        metalness: 1.0,
        roughness: 0.0
      });
      const coin: THREE.Mesh = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set(lane * this.laneWidth, 1.2, zOffset);
      coin.castShadow = true;
      coin.receiveShadow = true;
      coin.rotation.x = Math.PI / 2;
      const typedCoin = coin as ObjectWithType;
      typedCoin.type = 'coin';
      typedCoin.scoreValue = 1;
      typedCoin.isCollected = false;
      typedCoin.visible = true;
      parent.add(coin);
      return coin;
    }
  }

  private spawnBomb(parent: THREE.Group, lane: number, zOffset: number): THREE.Object3D | null {
    if (!this.bombModel) {
      this.createFallbackBomb();
    }
    if (this.bombModel) {
      const bomb: THREE.Object3D = this.bombModel.clone();
      bomb.traverse((child: THREE.Object3D): void => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      bomb.position.set(lane * this.laneWidth, 0.5, zOffset);
      bomb.visible = true;
      const typedBomb = bomb as ObjectWithType;
      typedBomb.type = 'bomb';
      bomb.rotation.y = Math.random() * Math.PI * 2;
      parent.add(bomb);
      return bomb;
    }
    return null;
  }

  update(playerZ: number): void {
    if (this.chunks.length > 0) {
      let lastChunk: THREE.Group = this.chunks[this.chunks.length - 1];
      let lastChunkEndZ: number = lastChunk.position.z + this.chunkLength;
      while (playerZ + this.CHUNK_SPAWN_DISTANCE > lastChunkEndZ) {
        const newChunkZ: number = lastChunkEndZ;
        this.createChunk(newChunkZ);
        this.lastChunkZ = newChunkZ;
        lastChunk = this.chunks[this.chunks.length - 1];
        lastChunkEndZ = lastChunk.position.z + this.chunkLength;
      }
    }

    this.chunks.forEach((chunk: THREE.Group): void => {
      chunk.children.forEach((child: THREE.Object3D): void => {
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'coin' && !typedChild.isCollected && typedChild.initialRotation !== undefined) {
          child.rotation.y += 0.03;
          child.position.y = 1.2 + Math.sin(Date.now() * 0.003 + typedChild.initialRotation) * 0.1;
        }
      });
    });

    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk: THREE.Group = this.chunks[i];
      const chunkEndZ: number = chunk.position.z + this.chunkLength;

      if (chunkEndZ < playerZ - this.CHUNK_REMOVE_DISTANCE) {
        let hasUncollectedCoins: boolean = false;
        for (const child of chunk.children) {
          const typedChild = child as ObjectWithType;
          if (typedChild.type === 'coin' && !typedChild.isCollected && child.visible) {
            hasUncollectedCoins = true;
            break;
          }
        }

        if (hasUncollectedCoins) {
          continue;
        }

        this.scene.remove(chunk);
        chunk.traverse((child: THREE.Object3D): void => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m: THREE.Material): void => m && m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        this.chunks.splice(i, 1);
      }
    }

    if (this.chunks.length > this.MAX_CHUNKS) {
      const toRemove: number = this.chunks.length - this.MAX_CHUNKS;
      for (let i = 0; i < toRemove; i++) {
        const oldest: THREE.Group | undefined = this.chunks.shift();
        if (oldest) {
          this.scene.remove(oldest);
          oldest.traverse((child: THREE.Object3D): void => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((m: THREE.Material): void => m && m.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
      }
    }
  }

  getActiveObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.chunks.forEach((chunk: THREE.Group): void => {
      chunk.children.forEach((child: THREE.Object3D): void => {
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'coin' || typedChild.type === 'bomb' || typedChild.type === 'gate') {
          objects.push(child);
        }
      });
    });
    return objects;
  }

  removeObject(obj: THREE.Object3D): void {
    this.chunks.forEach((chunk: THREE.Group): void => {
      const index: number = chunk.children.indexOf(obj);
      if (index > -1) {
        chunk.remove(obj);
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: THREE.Material): void => m && m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        } else if (obj instanceof THREE.Group) {
          obj.traverse((child: THREE.Object3D): void => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((m: THREE.Material): void => m && m.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
      }
    });
  }
}
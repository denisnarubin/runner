// helpers/chunkManager.ts
import * as THREE from 'three';
import { ObjectSpawner } from './objectSpawner';
import { disposeObject } from '../utils/textureSetup';
import * as CONST from '../constants/world';
import type { ObjectWithType } from '../types/types';

export class ChunkManager {
  private chunks: THREE.Group[] = [];
  private lastChunkZ: number = 0;
  private scene: THREE.Scene;
  private objectSpawner: ObjectSpawner;

  constructor(scene: THREE.Scene, objectSpawner: ObjectSpawner) {
    this.scene = scene;
    this.objectSpawner = objectSpawner;
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < CONST.CHUNK.INITIAL_CHUNKS; i++) {
      const zPos = i * CONST.CHUNK.LENGTH;
      this.createChunk(zPos);
      this.lastChunkZ = Math.max(this.lastChunkZ, zPos);
    }
  }

  private createChunk(zPosition: number): THREE.Group {
    const chunk = new THREE.Group();
    
    // Создаем дорогу
    const road = this.createRoad();
    chunk.add(road);
    
    // Спавним объекты
    this.objectSpawner.spawnInChunk(chunk);
    
    chunk.position.z = zPosition;
    chunk.name = `chunk_z${zPosition}`;
    
    this.scene.add(chunk);
    this.chunks.push(chunk);
    
    return chunk;
  }

  private createRoad(): THREE.Mesh {
    const roadGeo = new THREE.PlaneGeometry(5.5, CONST.CHUNK.LENGTH);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x666666,
      emissiveIntensity: 0.7
    });
    
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.01;
    road.receiveShadow = true;
    road.name = 'road';
    
    return road;
  }

  update(playerZ: number): void {
    this.spawnNewChunks(playerZ);
    this.animateCoins();
    this.removeOldChunks(playerZ);
    this.limitChunkCount();
  }

  private spawnNewChunks(playerZ: number): void {
    if (this.chunks.length === 0) return;
    
    let lastChunk = this.chunks[this.chunks.length - 1];
    let lastChunkEndZ = lastChunk.position.z + CONST.CHUNK.LENGTH;
    
    while (playerZ + CONST.CHUNK.SPAWN_DISTANCE > lastChunkEndZ) {
      this.createChunk(lastChunkEndZ);
      this.lastChunkZ = lastChunkEndZ;
      
      lastChunk = this.chunks[this.chunks.length - 1];
      lastChunkEndZ = lastChunk.position.z + CONST.CHUNK.LENGTH;
    }
  }

  private animateCoins(): void {
    this.chunks.forEach(chunk => {
      chunk.children.forEach(child => {
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'coin' && !typedChild.isCollected) {
          child.rotation.y += CONST.COIN.ROTATION_SPEED;
          
          // Используем значение по умолчанию, если initialRotation не определен
          const initialRotation = typedChild.initialRotation ?? 0;
          child.position.y = 1.2 + Math.sin(Date.now() * 0.003 + initialRotation) * CONST.COIN.FLOAT_AMPLITUDE;
        }
      });
    });
  }

  private removeOldChunks(playerZ: number): void {
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      const chunkEndZ = chunk.position.z + CONST.CHUNK.LENGTH;
      
      if (chunkEndZ < playerZ - CONST.CHUNK.REMOVE_DISTANCE) {
        if (this.hasUncollectedCoins(chunk)) continue;
        
        this.scene.remove(chunk);
        chunk.traverse(disposeObject);
        this.chunks.splice(i, 1);
      }
    }
  }

  private hasUncollectedCoins(chunk: THREE.Group): boolean {
    return Array.from(chunk.children).some(child => {
      const typedChild = child as ObjectWithType;
      return typedChild.type === 'coin' && !typedChild.isCollected && child.visible;
    });
  }

  private limitChunkCount(): void {
    if (this.chunks.length <= CONST.CHUNK.MAX_CHUNKS) return;
    
    const toRemove = this.chunks.length - CONST.CHUNK.MAX_CHUNKS;
    for (let i = 0; i < toRemove; i++) {
      const oldest = this.chunks.shift();
      if (oldest) {
        this.scene.remove(oldest);
        oldest.traverse(disposeObject);
      }
    }
  }

  respawnObjects(): void {
    this.chunks.forEach(chunk => {
      // Удаляем старые объекты
      for (let i = chunk.children.length - 1; i >= 0; i--) {
        const child = chunk.children[i];
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'bomb' || typedChild.type === 'coin' || typedChild.type === 'gate') {
          chunk.remove(child);
        }
      }
      // Спавним новые
      this.objectSpawner.spawnInChunk(chunk);
    });
  }

  getActiveObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.chunks.forEach(chunk => {
      chunk.children.forEach(child => {
        const typedChild = child as ObjectWithType;
        if (typedChild.type === 'coin' || typedChild.type === 'bomb' || typedChild.type === 'gate') {
          objects.push(child);
        }
      });
    });
    return objects;
  }

  removeObject(obj: THREE.Object3D): void {
    for (const chunk of this.chunks) {
      const index = chunk.children.indexOf(obj);
      if (index > -1) {
        chunk.remove(obj);
        disposeObject(obj);
        break;
      }
    }
  }
}
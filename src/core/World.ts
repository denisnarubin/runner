// world/World.ts
import * as THREE from 'three';
import { ChunkManager } from '../helpers/chunkManager';
import { ObjectSpawner } from '../helpers/objectSpawner';
import { ModelLoader } from '../utils/modelLoader';

import * as CONST from '../constants/world';

export class World {
  private scene: THREE.Scene;
  private chunkManager: ChunkManager | null = null;
  private _respawnDone: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initialize();
    this.setupLights();
  }

  private async initialize(): Promise<void> {
    try {
      const [coinModel, bombModel] = await Promise.all([
        ModelLoader.loadCoinModel(),
        ModelLoader.loadBombModel()
      ]);

      const objectSpawner = new ObjectSpawner(
        coinModel,
        bombModel,
        'plus-left' // начальный layout
      );

      this.chunkManager = new ChunkManager(this.scene, objectSpawner);

      // Небольшая задержка для гарантии загрузки
      setTimeout(() => {
        if (!this._respawnDone && this.chunkManager) {
          this.chunkManager.respawnObjects();
          this._respawnDone = true;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to initialize world:', error);
    }
  }

  private setupLights(): void {
    const bombLight = new THREE.PointLight(
      CONST.LIGHTS.BOMB.color,
      CONST.LIGHTS.BOMB.intensity,
      CONST.LIGHTS.BOMB.distance
    );
    bombLight.position.set(0, 8, 5);
    this.scene.add(bombLight);

    const roadLight = new THREE.PointLight(
      CONST.LIGHTS.ROAD.color,
      CONST.LIGHTS.ROAD.intensity,
      CONST.LIGHTS.ROAD.distance
    );
    roadLight.position.set(0, 15, 0);
    this.scene.add(roadLight);
  }

  update(playerZ: number): void {
    this.chunkManager?.update(playerZ);
  }

  getActiveObjects(): THREE.Object3D[] {
    return this.chunkManager?.getActiveObjects() || [];
  }

  removeObject(obj: THREE.Object3D): void {
    this.chunkManager?.removeObject(obj);
  }
}
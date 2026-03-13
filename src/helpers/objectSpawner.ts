
import * as THREE from 'three';
import { Gate } from '../core/Gate';
import { CollisionHelper } from './collisionHelper';
import type { ObjectWithType, Position2D, SpawnCounts, GatePairLayout } from '../types/types';
import * as CONST from '../constants/world';

export class ObjectSpawner {
  private coinModel: THREE.Object3D | null;
  private bombModel: THREE.Object3D | null;
  private currentGateLayout: GatePairLayout;

  constructor(
    coinModel: THREE.Object3D | null,
    bombModel: THREE.Object3D | null,
    currentGateLayout: GatePairLayout
  ) {
    this.coinModel = coinModel;
    this.bombModel = bombModel;
    this.currentGateLayout = currentGateLayout;
  }

  spawnInChunk(parent: THREE.Group): SpawnCounts {
    const coinPositions: Position2D[] = [];
    const bombPositions: Position2D[] = [];
    
    const coinCount = this.spawnCoins(parent, coinPositions);
    const bombCount = this.spawnBombs(parent, coinPositions, bombPositions);
    const gateCount = this.spawnGate(parent, bombPositions);

    return { coins: coinCount, bombs: bombCount, gates: gateCount };
  }

  private spawnCoins(parent: THREE.Group, coinPositions: Position2D[]): number {
    let count = 0;
    const rows = this.determineRowCount();
    const selectedLanes = this.selectRandomLanes(rows);
    
    const coinSpacing = CONST.CHUNK.LENGTH / (CONST.COIN.PER_ROW + 1);

    for (const lane of selectedLanes) {
      for (let i = 1; i <= CONST.COIN.PER_ROW; i++) {
        const zOffset = i * coinSpacing - CONST.CHUNK.LENGTH / 2;
        const coin = this.spawnCoin(parent, lane, zOffset);
        if (coin) {
          coinPositions.push({ lane, z: zOffset });
          count++;
        }
      }
    }
    return count;
  }

  private determineRowCount(): number {
    const rand = Math.random();
    if (rand < CONST.COIN.CHANCE_FOR_1_ROW) return 1;
    if (rand < CONST.COIN.CHANCE_FOR_1_ROW + CONST.COIN.CHANCE_FOR_2_ROWS) return 2;
    return 3;
  }

  private selectRandomLanes(count: number): number[] {
    const available = [...CONST.LANE.POSITIONS];
    const selected: number[] = [];
    
    for (let i = 0; i < count; i++) {
      if (available.length === 0) break;
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected.sort((a, b) => a - b);
  }

  private spawnBombs(
    parent: THREE.Group,
    coinPositions: Position2D[],
    bombPositions: Position2D[]
  ): number {
    if (Math.random() >= CONST.BOMB.SPAWN_CHANCE) return 0;

    let count = 0;
    const bombsToSpawn = Math.floor(Math.random() * CONST.BOMB.MAX_PER_CHUNK) + 1;
    const chunkGlobalZ = parent.position.z;

    for (let b = 0; b < bombsToSpawn; b++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const lane = Math.floor(Math.random() * 3) - 1;
        const zOffset = (Math.random() * (CONST.CHUNK.LENGTH - 6)) + 3 - CONST.CHUNK.LENGTH / 2;
        
        if (CollisionHelper.isInSafeZone(chunkGlobalZ + zOffset)) continue;
        if (CollisionHelper.isTooCloseToBomb({ lane, z: zOffset }, bombPositions)) continue;
        if (CollisionHelper.isTooCloseToCoin({ lane, z: zOffset }, coinPositions)) continue;

        const bomb = this.spawnBomb(parent, lane, zOffset);
        if (bomb) {
          bombPositions.push({ lane, z: zOffset });
          count++;
          break;
        }
      }
    }
    return count;
  }

  private spawnGate(parent: THREE.Group, bombPositions: Position2D[]): number {
    if (Math.random() >= CONST.GATE.SPAWN_CHANCE) return 0;

    for (let attempt = 0; attempt < 20; attempt++) {
      const zOffset = (Math.random() * (CONST.CHUNK.LENGTH - 8)) + 4 - CONST.CHUNK.LENGTH / 2;
      
      if (CollisionHelper.isInSafeZone(parent.position.z + zOffset)) continue;
      if (!CollisionHelper.canPlaceGate(zOffset, bombPositions)) continue;

      const modifierTypes: Array<'+' | '-' | 'x'> = ['+', '-', 'x'];
      const randomType = modifierTypes[Math.floor(Math.random() * modifierTypes.length)];
      
      const gate = new Gate(
        { type: randomType, value: 1 },
        zOffset,
        this.currentGateLayout,
        true
      );
      
      const gateMesh = gate.getMesh() as ObjectWithType;
      gateMesh.type = 'gate';
      gateMesh.gate = gate;
      parent.add(gateMesh);
      
      this.currentGateLayout = Gate.getNextLayout(this.currentGateLayout);
      return 1;
    }
    return 0;
  }

  private spawnCoin(parent: THREE.Group, lane: number, zOffset: number): THREE.Object3D | null {
    const coin = this.coinModel?.clone() || this.createFallbackCoin();
    
    coin.position.set(lane * CONST.LANE.WIDTH, 1.2, zOffset);
    coin.castShadow = true;
    coin.receiveShadow = true;
    
    const typedCoin = coin as ObjectWithType;
    typedCoin.type = 'coin';
    typedCoin.scoreValue = 1;
    typedCoin.initialRotation = Math.random() * Math.PI * 2;
    typedCoin.isCollected = false;
    
    parent.add(coin);
    return coin;
  }

  private spawnBomb(parent: THREE.Group, lane: number, zOffset: number): THREE.Object3D | null {
    if (!this.bombModel) return null;
    
    const bomb = this.bombModel.clone();
    bomb.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    bomb.position.set(lane * CONST.LANE.WIDTH, 0.5, zOffset);
    bomb.rotation.y = Math.random() * Math.PI * 2;
    
    const typedBomb = bomb as ObjectWithType;
    typedBomb.type = 'bomb';
    
    parent.add(bomb);
    return bomb;
  }

  private createFallbackCoin(): THREE.Mesh {
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 1.0,
      roughness: 0.0
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    return coin;
  }
}
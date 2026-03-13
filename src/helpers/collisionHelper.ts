// helpers/collisionHelper.ts
import type { Position2D } from '../types/types';
import * as CONST from '../constants/world';

export class CollisionHelper {
  static isTooCloseToBomb(
    newPos: Position2D, 
    bombPositions: Position2D[]
  ): boolean {
    return bombPositions.some(bomb => 
      bomb.lane === newPos.lane && 
      Math.abs(bomb.z - newPos.z) < CONST.BOMB.MIN_SAFE_DISTANCE
    );
  }

  static isTooCloseToCoin(
    newPos: Position2D,
    coinPositions: Position2D[]
  ): boolean {
    return coinPositions.some(coin =>
      coin.lane === newPos.lane && 
      Math.abs(coin.z - newPos.z) < CONST.BOMB.MIN_DISTANCE_FROM_COIN
    );
  }

  static isInSafeZone(globalZ: number): boolean {
    return globalZ < CONST.SAFE_ZONE.START;
  }

  static canPlaceGate(zOffset: number, bombPositions: Position2D[]): boolean {
    return !bombPositions.some(bomb => 
      Math.abs(bomb.z - zOffset) < CONST.GATE.MIN_DISTANCE_FROM_BOMB
    );
  }
}
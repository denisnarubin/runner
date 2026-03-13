import * as THREE from 'three';
import type { Gate } from '../core/Gate';

export type ObjectWithType = THREE.Object3D & {
  type?: 'coin' | 'bomb' | 'gate';
  scoreValue?: number;
  initialRotation?: number;
  isCollected?: boolean;
  visible?: boolean;
  gate?: Gate;
};

export type Position2D = {
  lane: number;
  z: number;
};

export type SpawnCounts = {
  coins: number;
  bombs: number;
  gates: number;
};

export type AnimationToLoad = {
  path: string;
  name: string;
};

export type GateModifier = {
  type: '+' | '-' | 'x';
  value: number;
};

export type GatePairLayout = 'plus-left' | 'minus-left' | 'multiply-left';

export type GateSection = 'left' | 'right' | 'center';



export type CharacterSkin =
  | 'Character_Jock'
  | 'Character_Grandma'
  | 'Character_ShopKeeper'
  | 'Character_SummerGirl'
  | 'Character_Hobo'
  | 'Character_HipsterGirl'
  | 'Character_FastFoodGuy'
  | 'Character_HipsterGuy'
  | 'Character_Roadworker'
  | 'Character_Gangster'
  | 'Character_Biker'
  | 'Character_FireFighter'
  | 'Character_PunkGuy'
  | 'Character_Grandpa'
  | 'Character_Tourist'
  | 'Character_Hotdog'
  | 'Character_PunkGirl'
  | 'Character_Paramedic'
  | 'Character_GamerGirl'
  | 'ALL';

export type PlayerState = 'idle' | 'running' | 'falling' | 'dancing' | 'breakdance' | 'finished';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover' | 'finished';



export type SoundName =
  | 'coin'
  | 'bomb'
  | 'gate'
  | 'lose'
  | 'win'
  | 'step_0'
  | 'step_1'
  | 'step_2';

export type ObjectType = 'coin' | 'bomb' | 'gate';

export type Lane = -1 | 0 | 1;

export type Effect = {
  update(delta: number): boolean;
};

export type ModifierType = '+' | '-' | 'x';
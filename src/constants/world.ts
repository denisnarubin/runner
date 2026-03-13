// constants/world.ts
export const CHUNK = {
    LENGTH: 20,
    SPAWN_DISTANCE: 200,
    REMOVE_DISTANCE: 180,
    MAX_CHUNKS: 50,
    INITIAL_CHUNKS: 25
  } as const;
  
  export const LANE = {
    WIDTH: 1.8,
    POSITIONS: [-1, 0, 1] as const
  } as const;
  
  export const BOMB = {
    MAX_PER_CHUNK: 2,
    SPAWN_CHANCE: 0.5,
    MIN_SAFE_DISTANCE: 2.5,
    MIN_DISTANCE_FROM_COIN: 1.2
  } as const;
  
  export const COIN = {
    PER_ROW: 5,
    CHANCE_FOR_1_ROW: 0.4,
    CHANCE_FOR_2_ROWS: 0.4,
    FLOAT_AMPLITUDE: 0.1,
    ROTATION_SPEED: 0.03
  } as const;
  
  export const GATE = {
    SPAWN_CHANCE: 0.15,
    MIN_DISTANCE_FROM_BOMB: 3.0
  } as const;
  
  export const SAFE_ZONE = {
    START: 40
  } as const;
  
  export const LIGHTS = {
    BOMB: { color: 0xff6666, intensity: 0.6, distance: 20 },
    ROAD: { color: 0xffffff, intensity: 2.0, distance: 100 }
  } as const;
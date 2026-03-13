
export const GATE = {
    FRAME_HEIGHT: 3.8,
    ROAD_HALF_WIDTH: 2.7,
    PAIR_GAP: 0.3,
    FRAME_WIDTH: 0.15,
    FRAME_DEPTH: 0.15,
    WALL_OPACITY: 0.3,
    TEXT_Z_OFFSET: 0.12,
    CENTER_TEXT_Z_OFFSET: 0.1,
    TEXT_WIDTH_FACTOR: 0.75,
    TEXT_HEIGHT_FACTOR: 0.55,
    MULTIPLY_CHANCE: 0.2
  } as const;
  
  export const GATE_COLORS = {
    FRAME: {
      COLOR: 0x33aaff,
      EMISSIVE: 0x114477,
      EMISSIVE_INTENSITY: 0.7,
      ROUGHNESS: 0.2,
      METALNESS: 0.3
    },
    WALL: {
      COLOR: 0x88ccff,
      EMISSIVE: 0x224466,
      EMISSIVE_INTENSITY: 0.4,
      ROUGHNESS: 0.1,
      METALNESS: 0.1
    },
    TEXT: {
      STROKE: '#000000',
      FILL: '#ffffff',
      SHADOW: '#33aaff',
      SHADOW_BLUR: 20,
      EMISSIVE_INTENSITY: 0.6
    }
  } as const;
  
  export const GATE_MODIFIER = {
    PLUS_MIN_MAX: 10,
    MULTIPLY_MIN: 2,
    MULTIPLY_MAX: 3
  } as const;
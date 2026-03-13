
import * as THREE from 'three';
import type { GateModifier } from '../types/types';
import { GATE_MODIFIER } from '../constants/gate';

export function generateModifierValue(type: '+' | '-' | 'x'): number {
  switch (type) {
    case '+':
    case '-':
      return Math.floor(Math.random() * GATE_MODIFIER.PLUS_MIN_MAX) + 1;
    case 'x':
      return Math.floor(Math.random() * (GATE_MODIFIER.MULTIPLY_MAX - GATE_MODIFIER.MULTIPLY_MIN + 1)) + GATE_MODIFIER.MULTIPLY_MIN;
    default:
      return 1;
  }
}

export function getModifierText(modifier: GateModifier): string {
  switch (modifier.type) {
    case '-':
      return `−${modifier.value}`;
    case 'x':
      return `×${modifier.value}`;
    default:
      return `${modifier.type}${modifier.value}`;
  }
}

export function createFrameMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x33aaff,
    emissive: 0x114477,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.3
  });
}

export function createWallMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x224466,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.1,
    metalness: 0.1
  });
}
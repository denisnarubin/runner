// core/GateWall.ts
import * as THREE from 'three';
import type { GateModifier, GateSection } from '../types/types';
import { GATE, GATE_COLORS } from '../constants/gate';
import { createWallMaterial, getModifierText } from '../utils/gateUtils';

export class GateWall {
  static create(
    leftX: number,
    rightX: number,
    modifier: GateModifier,
    section: GateSection
  ): THREE.Group {
    const group = new THREE.Group();
    
    const wall = this.createWall(leftX, rightX);
    group.add(wall);
    
    const text = this.createText(leftX, rightX, modifier, section);
    group.add(text);
    
    return group;
  }

  private static createWall(leftX: number, rightX: number): THREE.Mesh {
    const centerX = (leftX + rightX) / 2;
    const wallWidth = Math.abs(rightX - leftX) - GATE.FRAME_WIDTH;
    
    const material = createWallMaterial();
    const geometry = new THREE.PlaneGeometry(wallWidth, GATE.FRAME_HEIGHT);
    
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(centerX, 0, 0);
    wall.rotation.y = 0;
    wall.castShadow = false;
    wall.receiveShadow = false;
    
    return wall;
  }

  private static createText(
    leftX: number,
    rightX: number,
    modifier: GateModifier,
    section: GateSection
  ): THREE.Mesh {
    const centerX = (leftX + rightX) / 2;
    const wallWidth = Math.abs(rightX - leftX) - GATE.FRAME_WIDTH;
    
    const canvas = this.createCanvas(modifier);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = true;
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveIntensity: GATE_COLORS.TEXT.EMISSIVE_INTENSITY
    });

    const textWidth = wallWidth * GATE.TEXT_WIDTH_FACTOR;
    const textHeight = GATE.FRAME_HEIGHT * GATE.TEXT_HEIGHT_FACTOR;
    const geometry = new THREE.PlaneGeometry(textWidth, textHeight);
    
    const text = new THREE.Mesh(geometry, material);
    text.rotation.y = Math.PI;
    
    const zOffset = (section === 'left' || section === 'right') 
      ? GATE.TEXT_Z_OFFSET 
      : GATE.CENTER_TEXT_Z_OFFSET;
    text.position.set(centerX, 0, zOffset);
    
    return text;
  }

  private static createCanvas(modifier: GateModifier): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const modifierText = getModifierText(modifier);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'Bold 140px Arial';
    ctx.strokeStyle = GATE_COLORS.TEXT.STROKE;
    ctx.lineWidth = 8;
    ctx.strokeText(modifierText, canvas.width / 2, canvas.height / 2);

    ctx.shadowColor = GATE_COLORS.TEXT.SHADOW;
    ctx.shadowBlur = GATE_COLORS.TEXT.SHADOW_BLUR;
    ctx.fillStyle = GATE_COLORS.TEXT.FILL;
    ctx.fillText(modifierText, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;

    return canvas;
  }
}
// core/GateFrame.ts
import * as THREE from 'three';
import { GATE } from '../constants/gate';
import { createFrameMaterial } from '../utils/gateUtils';

export class GateFrame {
  static create(material?: THREE.Material): THREE.Mesh {
    const frameMaterial = material || createFrameMaterial();
    const geometry = new THREE.BoxGeometry(
      GATE.FRAME_WIDTH,
      GATE.FRAME_HEIGHT,
      GATE.FRAME_DEPTH
    );
    
    const frame = new THREE.Mesh(geometry, frameMaterial);
    frame.castShadow = true;
    frame.receiveShadow = true;
    
    return frame;
  }

  static createPair(
    leftX: number,
    rightX: number,
    material?: THREE.Material
  ): THREE.Mesh[] {
    const frameMaterial = material || createFrameMaterial();
    
    const leftFrame = this.create(frameMaterial);
    leftFrame.position.set(leftX, 0, 0);
    
    const rightFrame = this.create(frameMaterial);
    rightFrame.position.set(rightX, 0, 0);
    
    return [leftFrame, rightFrame];
  }
}
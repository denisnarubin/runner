// core/Gate.ts
import * as THREE from 'three';
import type { GateModifier, GatePairLayout, GateSection } from '../types/types';
import { GateModifierGenerator } from './GateModifierGenerator';
import { GateFrame } from './GateFrame';
import { GateWall } from './GateWall';
import { GATE } from '../constants/gate';
import { createFrameMaterial } from '../utils/gateUtils';

export class Gate {
  private mesh: THREE.Group;
  private leftModifier: GateModifier | null = null;
  private rightModifier: GateModifier | null = null;
  private position: THREE.Vector3;
  private isPaired: boolean;
  private passed: boolean = false;

  constructor(
    modifier: GateModifier,
    zPosition: number,
    layout: GatePairLayout = 'plus-left',
    isPaired: boolean = true
  ) {
    this.mesh = new THREE.Group();
    this.isPaired = isPaired;
    this.position = new THREE.Vector3(0, GATE.FRAME_HEIGHT / 2, zPosition);

    if (this.isPaired) {
      const modifiers = GateModifierGenerator.generateForPairedLayout(layout);
      this.leftModifier = modifiers.left;
      this.rightModifier = modifiers.right;
    } else {
      this.leftModifier = GateModifierGenerator.generateSingle(modifier);
    }

    this.createGate();
  }

  private createGate(): void {
    const frameMaterial = createFrameMaterial();

    if (this.isPaired && this.leftModifier && this.rightModifier) {
      this.createPairedGate(frameMaterial);
    } else if (this.leftModifier) {
      this.createSingleGate(frameMaterial);
    }

    this.mesh.position.copy(this.position);
  }

  private createPairedGate(material: THREE.Material): void {
    const leftSectionLeftX = -GATE.ROAD_HALF_WIDTH;
    const leftSectionRightX = -GATE.PAIR_GAP / 2;
    const rightSectionLeftX = GATE.PAIR_GAP / 2;
    const rightSectionRightX = GATE.ROAD_HALF_WIDTH;


    this.createGateSection(
      leftSectionLeftX,
      leftSectionRightX,
      this.leftModifier!,
      material,
      'left'
    );


    this.createGateSection(
      rightSectionLeftX,
      rightSectionRightX,
      this.rightModifier!,
      material,
      'right'
    );
  }

  private createSingleGate(material: THREE.Material): void {
    const leftX = -GATE.ROAD_HALF_WIDTH / 2;
    const rightX = GATE.ROAD_HALF_WIDTH / 2;
    
    this.createGateSection(
      leftX,
      rightX,
      this.leftModifier!,
      material,
      'center'
    );
  }

  private createGateSection(
    leftX: number,
    rightX: number,
    modifier: GateModifier,
    material: THREE.Material,
    section: GateSection
  ): void {

    const frames = GateFrame.createPair(leftX, rightX, material);
    frames.forEach(frame => this.mesh.add(frame));


    const wall = GateWall.create(leftX, rightX, modifier, section);
    this.mesh.add(wall);
  }

  markAsPassed(): void {
    this.passed = true;
  }

  isPassed(): boolean {
    return this.passed;
  }

  getModifier(side: 'left' | 'right'): GateModifier | null {
    if (!this.isPaired) return this.leftModifier;
    return side === 'left' ? this.leftModifier : this.rightModifier;
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  isPairedGate(): boolean {
    return this.isPaired;
  }

  static getNextLayout(current: GatePairLayout): GatePairLayout {
    return GateModifierGenerator.getNextLayout(current);
  }
}
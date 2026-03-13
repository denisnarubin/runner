
import type { GateModifier, GatePairLayout } from '../types/types';
import { generateModifierValue } from '../utils/gateUtils';
import { GATE } from '../constants/gate';

export class GateModifierGenerator {
  static generateForPairedLayout(layout: GatePairLayout): {
    left: GateModifier;
    right: GateModifier;
  } {
    const useMultiply = Math.random() < GATE.MULTIPLY_CHANCE;
    
    if (useMultiply) {
      return this.generateMultiplyLayout(layout);
    } else {
      return this.generateStandardLayout(layout);
    }
  }

  private static generateMultiplyLayout(layout: GatePairLayout): {
    left: GateModifier;
    right: GateModifier;
  } {
    if (layout === 'multiply-left') {
      return {
        left: { type: 'x', value: generateModifierValue('x') },
        right: { type: '-', value: generateModifierValue('-') }
      };
    } else {
      return {
        left: { type: '-', value: generateModifierValue('-') },
        right: { type: 'x', value: generateModifierValue('x') }
      };
    }
  }

  private static generateStandardLayout(layout: GatePairLayout): {
    left: GateModifier;
    right: GateModifier;
  } {
    if (layout === 'plus-left') {
      return {
        left: { type: '+', value: generateModifierValue('+') },
        right: { type: '-', value: generateModifierValue('-') }
      };
    } else {
      return {
        left: { type: '-', value: generateModifierValue('-') },
        right: { type: '+', value: generateModifierValue('+') }
      };
    }
  }

  static generateSingle(modifier: GateModifier): GateModifier {
    return {
      type: modifier.type,
      value: generateModifierValue(modifier.type)
    };
  }

  static getNextLayout(current: GatePairLayout): GatePairLayout {
    const layouts: GatePairLayout[] = ['plus-left', 'minus-left', 'multiply-left'];
    const currentIndex = layouts.indexOf(current);
    return layouts[(currentIndex + 1) % layouts.length];
  }
}
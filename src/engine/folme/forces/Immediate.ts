// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Immediate —— 立即设值 (冻结)
//  直通当前值，归零速度
//  移植自 com.kenefe.folme.force.Immediate (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IForce, ForceInfo } from '../types'

/**
 * 立即设值力 —— 保持当前值不变，速度归零
 * 用于 setTo() 等立即到位场景，也可用于"冻结"某属性
 */
export class Immediate implements IForce {
  target = 0
  resultValue = 0
  resultSpeed = 0

  getValueAndSpeed(
    value: number, _speed: number, _dt: number,
    _info: ForceInfo, _prev: ForceInfo | null,
  ): void {
    this.resultValue = value
    this.resultSpeed = 0
  }

  clone(): IForce {
    return new Immediate()
  }
}

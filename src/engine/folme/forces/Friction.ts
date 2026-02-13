// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Friction —— 摩擦力
//  指数速度衰减 + 梯形积分更新位置
//  移植自 com.kenefe.folme.force.Friction (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IForce, ForceInfo } from '../types'

/**
 * 摩擦力 —— 速度随时间指数衰减，无目标值
 *
 * friction — 摩擦系数 (典型值 1/2.1 ≈ 0.476)
 *   值越大衰减越快，0 = 不衰减
 *
 * 内部转换: drag = e^(friction × -4.2)
 *   drag ∈ (0,1)，每秒速度乘以 drag
 */
const DRAG_FACTOR = -4.2

export class Friction implements IForce {
  resultValue = 0
  resultSpeed = 0

  readonly sourceFriction: number
  private readonly drag: number

  constructor(friction: number) {
    this.sourceFriction = friction
    this.drag = Math.exp(friction * DRAG_FACTOR)
  }

  // ── 每帧计算 ──

  getValueAndSpeed(
    value: number, speed: number, dt: number,
    _info: ForceInfo, _prev: ForceInfo | null,
  ): void {
    const dtSec = dt / 1000
    const prevSpeed = speed

    // 指数衰减: v_new = v × drag^dt
    speed *= this.drag ** dtSec

    // 梯形积分: Δx = (v_old + v_new) / 2 × dt
    value += (prevSpeed + speed) / 2 * dtSec

    this.resultValue = value
    this.resultSpeed = speed
  }

  clone(): IForce {
    return new Friction(this.sourceFriction)
  }
}

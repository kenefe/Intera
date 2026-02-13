// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Spring —— 阻尼弹簧力
//  Apple 风格参数: response + damping
//  辛 Euler 积分 (先速度后位置，振荡稳定)
//  移植自 com.kenefe.folme.force.Spring (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IForce, ForceInfo } from '../types'

const TWO_PI = 2 * Math.PI

/**
 * 阻尼弹簧力
 * damping  — 阻尼比 (0~1+, 1=临界阻尼, >1=过阻尼)
 * response — 响应时间/秒 (越小越快)
 * mass     — 质量 (默认1)
 */
const MAX_DAMPING_COEFF = 60

export class Spring implements IForce {
  target = 0
  resultValue = 0
  resultSpeed = 0

  // ── 原始参数 (clone 用) ──
  readonly damping: number
  readonly response: number
  private readonly mass: number

  // ── 内部物理常数 ──
  private readonly tension: number
  private readonly dampingCoeff: number

  constructor(damping: number, response: number, mass = 1) {
    this.damping = damping
    this.response = response
    this.mass = mass

    // Apple 风格 → 物理参数
    // tension = (2π/response)² × mass  即弹簧刚度 k
    // dampingCoeff = 4π × damping × mass / response  即阻尼系数 c
    this.tension = (TWO_PI / response) ** 2 * mass
    this.dampingCoeff = Math.min(
      4 * Math.PI * damping * mass / response,
      MAX_DAMPING_COEFF,
    )
  }

  // ── 每帧计算 ──

  getValueAndSpeed(
    value: number, speed: number, dt: number,
    _info: ForceInfo, _prev: ForceInfo | null,
  ): void {
    const dtSec = dt / 1000

    // F = -c·v + k·(target - x)
    const impulse = (
      -speed * this.dampingCoeff
      + this.tension * (this.target - value)
    ) * dtSec

    // 辛 Euler: 先更新速度，再用新速度更新位置
    speed += impulse / this.mass
    value += speed * dtSec

    this.resultValue = value
    this.resultSpeed = speed
  }

  clone(): IForce {
    return new Spring(this.damping, this.response, this.mass)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SpringSim —— 离线弹簧轨迹计算
//  直接用 Spring 数学，不依赖 Timeline / rAF
//  用于: Lottie 帧烘焙、Video 逐帧渲染
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Spring } from '../folme/forces/Spring'
import type { ForceInfo } from '../folme/types'

const INFO: ForceInfo = {
  isEasing: false, targetCount: 1,
  hasAcceleration: false, hasPerlin: false,
}

/**
 * 模拟弹簧从 from → to 的完整轨迹
 * 返回每帧的值数组 (含起始帧)
 */
export function simulate(
  from: number, to: number,
  damping: number, response: number,
  fps = 60, maxFrames = 300,
): number[] {
  if (from === to) return [to]
  const spring = new Spring(damping, response)
  spring.target = to
  INFO.forceTarget = to

  const dt = 1000 / fps
  let v = from, s = 0
  const out = [from]

  for (let i = 0; i < maxFrames; i++) {
    spring.getValueAndSpeed(v, s, dt, INFO, null)
    v = spring.resultValue; s = spring.resultSpeed
    out.push(v)
    if (Math.abs(s) < 1e-4 && Math.abs(v - to) < 1e-3) { out[out.length - 1] = to; break }
  }
  return out
}

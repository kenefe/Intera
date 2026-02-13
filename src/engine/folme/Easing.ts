// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Easing —— 缓动插值器
//  基于时间的缓动函数，和物理力是两条路
//  移植自 IEasing.as + Interpolator.as + Bezier.as
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IEasing } from './types'

/** 缓动函数签名: 归一化时间 t∈[0,1] → 归一化进度 */
export type EasingFn = (t: number) => number

// ── Easing 类 ──

/** 缓动插值器 —— 在 duration 秒内从 fromValue 过渡到 toValue */
export class Easing implements IEasing {
  fn: EasingFn
  duration: number
  fromValue = 0
  toValue = 1
  progress = 0
  private elapsed = 0

  /** target 桥接 toValue，兼容 IForce 接口 */
  get target() { return this.toValue }
  set target(v: number) { this.toValue = v }

  constructor(fn: EasingFn, duration: number) {
    this.fn = fn
    this.duration = duration
  }

  next(dt: number): void {
    this.elapsed += dt
    const raw = this.elapsed / (this.duration * 1000)
    this.progress = this.fn(Math.max(0, Math.min(1, raw)))
  }

  isFinished(): boolean {
    return this.elapsed >= this.duration * 1000
  }

  getValue(): number {
    return this.fromValue + (this.toValue - this.fromValue) * this.progress
  }

  clone(): IEasing {
    return new Easing(this.fn, this.duration)
  }
}

// ── 多项式缓动生成器 ──
// type: 1=Out, 2=In, 3=InOut
// exp: 1=quad(²), 2=cubic(³), 3=quart(⁴), 4=quint(⁵)

function poly(type: 1 | 2 | 3, exp: number): EasingFn {
  return (p: number): number => {
    let r = type === 1 ? 1 - p : type === 2 ? p : p < 0.5 ? p * 2 : (1 - p) * 2
    r **= exp + 1
    return type === 1 ? 1 - r : type === 2 ? r : p < 0.5 ? r / 2 : 1 - r / 2
  }
}

// ── 缓动函数集合 ──

const HALF_PI = Math.PI / 2

export const Interpolator = {
  linear: ((t: number) => t) as EasingFn,

  quadOut: poly(1, 1), quadIn: poly(2, 1), quadInOut: poly(3, 1),
  cubicOut: poly(1, 2), cubicIn: poly(2, 2), cubicInOut: poly(3, 2),
  quartOut: poly(1, 3), quartIn: poly(2, 3), quartInOut: poly(3, 3),
  quintOut: poly(1, 4), quintIn: poly(2, 4), quintInOut: poly(3, 4),

  sinOut: (t: number) => Math.sin(t * HALF_PI),
  sinIn: (t: number) => 1 - Math.cos(t * HALF_PI),
  sinInOut: (t: number) => 0.5 * (1 - Math.cos(Math.PI * t)),

  expoOut: (t: number) => 1 - 2 ** (-10 * t),
  expoIn: (t: number) => 2 ** (10 * (t - 1)) - 0.001,
  expoInOut: (t: number) => {
    const p = t * 2
    return p < 1 ? 0.5 * 2 ** (10 * (p - 1)) : 0.5 * (2 - 2 ** (10 * (1 - p)))
  },
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  三阶贝塞尔缓动 (CSS transition 同款)
//  基于 bezier-easing by Gaëtan Renaudeau (MIT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NEWTON_ITERS = 4
const NEWTON_MIN_SLOPE = 0.001
const SUBDIV_PRECISION = 1e-7
const SUBDIV_MAX_ITERS = 10
const TABLE_SIZE = 11
const SAMPLE_STEP = 1 / (TABLE_SIZE - 1)

function evalCubic(t: number, a1: number, a2: number): number {
  const a = 1 - 3 * a2 + 3 * a1
  const b = 3 * a2 - 6 * a1
  return ((a * t + b) * t + 3 * a1) * t
}

function evalSlope(t: number, a1: number, a2: number): number {
  const a = 1 - 3 * a2 + 3 * a1
  const b = 3 * a2 - 6 * a1
  return 3 * a * t * t + 2 * b * t + 3 * a1
}

function newton(x: number, guess: number, x1: number, x2: number): number {
  for (let i = 0; i < NEWTON_ITERS; i++) {
    const slope = evalSlope(guess, x1, x2)
    if (slope === 0) return guess
    guess -= (evalCubic(guess, x1, x2) - x) / slope
  }
  return guess
}

function subdivide(x: number, lo: number, hi: number, x1: number, x2: number): number {
  for (let i = 0; i < SUBDIV_MAX_ITERS; i++) {
    const mid = lo + (hi - lo) / 2
    const err = evalCubic(mid, x1, x2) - x
    if (Math.abs(err) < SUBDIV_PRECISION) return mid
    if (err > 0) hi = mid; else lo = mid
  }
  return lo + (hi - lo) / 2
}

/** 创建三阶贝塞尔缓动函数 */
export function bezierEasing(
  x1: number, y1: number, x2: number, y2: number,
): EasingFn {
  if (x1 === y1 && x2 === y2) return (t) => t

  const samples = new Float64Array(TABLE_SIZE)
  for (let i = 0; i < TABLE_SIZE; i++) samples[i] = evalCubic(i * SAMPLE_STEP, x1, x2)

  return (x: number): number => {
    if (x === 0 || x === 1) return x

    let lo = 0, idx = 1
    for (; idx < TABLE_SIZE - 1 && samples[idx] <= x; idx++) lo += SAMPLE_STEP
    idx--

    const dist = (x - samples[idx]) / (samples[idx + 1] - samples[idx])
    const guess = lo + dist * SAMPLE_STEP
    const slope = evalSlope(guess, x1, x2)

    const t = slope >= NEWTON_MIN_SLOPE ? newton(x, guess, x1, x2)
      : slope === 0 ? guess
        : subdivide(x, lo, lo + SAMPLE_STEP, x1, x2)

    return evalCubic(t, y1, y2)
  }
}

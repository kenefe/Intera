// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FolmeEase —— 曲线工厂
//  spring() / friction() / bezier() …
//  移植自 com.kenefe.folme.FolmeEase (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Spring } from './forces/Spring'
import { Friction } from './forces/Friction'
import { Immediate } from './forces/Immediate'
import { Easing, Interpolator, bezierEasing } from './Easing'
import type { EasingFn } from './Easing'

// ── 默认值 ──

const D = 0.3                      // 缓动默认时长 (秒)
const DEFAULT_FRICTION = 1 / 2.1   // 默认摩擦系数

/** 内部辅助: 从缓动函数 + 时长创建 Easing 实例 */
const ease = (fn: EasingFn, d = D) => new Easing(fn, d)

// ── 工厂 ──

export const FolmeEase = {

  // ── 物理力 ──

  spring:    (damping: number, response: number, mass = 1) => new Spring(damping, response, mass),
  friction:  (f = DEFAULT_FRICTION) => new Friction(f),
  immediate: () => new Immediate(),

  // ── 缓动 (时间插值) ──

  linear:     (d = D) => ease(Interpolator.linear, d),

  quadOut:    (d = D) => ease(Interpolator.quadOut, d),
  quadIn:     (d = D) => ease(Interpolator.quadIn, d),
  quadInOut:  (d = D) => ease(Interpolator.quadInOut, d),

  cubicOut:   (d = D) => ease(Interpolator.cubicOut, d),
  cubicIn:    (d = D) => ease(Interpolator.cubicIn, d),
  cubicInOut: (d = D) => ease(Interpolator.cubicInOut, d),

  quartOut:   (d = D) => ease(Interpolator.quartOut, d),
  quartIn:    (d = D) => ease(Interpolator.quartIn, d),
  quartInOut: (d = D) => ease(Interpolator.quartInOut, d),

  quintOut:   (d = D) => ease(Interpolator.quintOut, d),
  quintIn:    (d = D) => ease(Interpolator.quintIn, d),
  quintInOut: (d = D) => ease(Interpolator.quintInOut, d),

  sinOut:     (d = D) => ease(Interpolator.sinOut, d),
  sinIn:      (d = D) => ease(Interpolator.sinIn, d),
  sinInOut:   (d = D) => ease(Interpolator.sinInOut, d),

  expoOut:    (d = D) => ease(Interpolator.expoOut, d),
  expoIn:     (d = D) => ease(Interpolator.expoIn, d),
  expoInOut:  (d = D) => ease(Interpolator.expoInOut, d),

  /** 三阶贝塞尔 (CSS cubic-bezier 同款算法) */
  bezier: (x1: number, y1: number, x2: number, y2: number, d = D) =>
    ease(bezierEasing(x1, y1, x2, y2), d),

} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Ani —— 单属性动画实例
//  管理单属性的力/缓动，每帧推进，判停
//  移植自 com.kenefe.folme.Ani (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IForce, IEasing, ForceInfo, AniStatusType } from './types'
import { AniStatus } from './types'
import { Immediate } from './forces/Immediate'

// ── 收敛阈值 ──

const MIN_SPEED = 1e-4     // 速度低于此值视为静止
const MIN_DISTANCE = 1e-3  // 距目标小于此值视为到达

/** Ani 的驱动器: 缓动 (时间插值) 或 力数组 (物理模拟) */
export type AniDriver = IEasing | IForce[]

// ── 工具函数 ──

const EASING_INFO: ForceInfo = {
  isEasing: true, targetCount: 0, hasAcceleration: false, hasPerlin: false,
}

function isEasingDriver(d: AniDriver): d is IEasing {
  return !Array.isArray(d)
}

/** 物理力是否已收敛 (速度趋零 + 位置到达) */
function isConverged(value: number, speed: number, info: ForceInfo): boolean {
  if (Math.abs(speed) >= MIN_SPEED) return false
  if (info.targetCount !== 1) return true
  return Math.abs(value - (info.forceTarget ?? 0)) < MIN_DISTANCE
}

/** 从力数组构建 ForceInfo */
function buildForceInfo(forces: IForce[]): ForceInfo {
  let immediateTarget: number | undefined
  let forceTarget: number | undefined
  let targetCount = 0

  for (const f of forces) {
    if (f instanceof Immediate) { immediateTarget = f.target; break }
    if (f.target !== undefined) { forceTarget = f.target; targetCount++ }
  }

  return {
    isEasing: false, immediateTarget, forceTarget,
    targetCount, hasAcceleration: false, hasPerlin: false,
  }
}

// ── Ani 类 ──

export class Ani {
  value = 0
  speed = 0
  status: AniStatusType = AniStatus.STOPPED

  /** 驱动器: 由 AniRequest / FolmeManager 设置 */
  driver: AniDriver | null = null

  private info: ForceInfo | null = null
  private prevInfo: ForceInfo | null = null

  /** driver 变更后调用，刷新 ForceInfo 缓存 */
  updateForceInfo(): void {
    this.prevInfo = this.info
    if (!this.driver) { this.info = null; return }
    this.info = isEasingDriver(this.driver) ? EASING_INFO : buildForceInfo(this.driver)
  }

  /** 每帧推进: 根据 driver 类型更新 value 和 speed */
  next(dt: number): void {
    if (this.status === AniStatus.STOPPED || !this.driver || !this.info) return
    const { info } = this

    // Immediate: 直接跳到目标
    if (info.immediateTarget !== undefined) {
      this.value = info.immediateTarget; this.speed = 0; return
    }

    // Easing: 时间插值
    if (info.isEasing) {
      const e = this.driver as IEasing
      e.next(dt); this.value = e.getValue(); this.speed = 0; return
    }

    // Forces: 物理力管线 (每个力顺序作用)
    for (const f of this.driver as IForce[]) {
      f.getValueAndSpeed(this.value, this.speed, dt, info, this.prevInfo)
      this.value = f.resultValue; this.speed = f.resultSpeed
    }
  }

  /** 检查是否收敛，若已停止则 snap 到精确目标值 */
  checkFinished(): void {
    if (this.status === AniStatus.STOPPED || !this.driver || !this.info) return
    const { info } = this

    // Immediate: 一帧即完
    if (info.immediateTarget !== undefined) { this.status = AniStatus.STOPPED; return }

    // Easing: 时间耗尽
    if (info.isEasing) {
      const e = this.driver as IEasing
      if (e.isFinished()) { this.value = e.toValue; this.status = AniStatus.STOPPED }
      return
    }

    // Forces: 速度 + 位置收敛
    if (!isConverged(this.value, this.speed, info)) return
    const forces = this.driver as IForce[]
    if (forces.length === 1 && forces[0].target !== undefined) this.value = forces[0].target
    this.status = AniStatus.STOPPED
  }
}

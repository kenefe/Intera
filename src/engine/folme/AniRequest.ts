// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AniRequest —— 单属性动画请求
//  封装一次 to() 产生的配置与生命周期
//  移植自 com.kenefe.folme.AniRequest (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IForce, IEasing, AniRequestStatusType, RangeTypeValue } from './types'
import { AniRequestStatus, AniStatus, RangeType } from './types'
import type { Ani } from './Ani'
import { Spring } from './forces/Spring'
import { Immediate } from './forces/Immediate'

// ── 常量 ──

const DEFAULT_RANGE: [number, number] = [-Infinity, Infinity]
const DEFAULT_SPRING: [number, number] = [0.95, 0.35]

// ── 类型 ──

/** AniRequest 构造参数 (FolmeManager 解析用户 config 后传入) */
export interface AniRequestInit {
  target: number
  ease: (IForce | IEasing)[]
  delay?: number              // 秒 (默认 0)
  isImmediate?: boolean
  range?: [number, number]
  rangeType?: RangeTypeValue
  rangeExtra?: number[]       // OVERSHOOT: [damping, response]  REBOUND: [factor]
  fromSpeed?: number
  rangeCallback?: (ani: Ani) => void
}

// ── 工具函数 ──

/** IEasing 独有 fromValue，IForce 没有 */
function isIEasing(f: IForce | IEasing): f is IEasing {
  return 'fromValue' in f
}

// ── AniRequest 类 ──

export class AniRequest {
  status: AniRequestStatusType = AniRequestStatus.WAITING
  readonly target: number
  readonly delay: number

  private ani: Ani | null = null
  private ease: (IForce | IEasing)[]
  private isImmediate: boolean
  private fromSpeed?: number
  private range: [number, number]
  private rangeType: RangeTypeValue
  private rangeExtra: number[]
  private rangeCallback?: (ani: Ani) => void

  constructor(init: AniRequestInit) {
    this.target = init.target
    this.ease = init.ease
    this.delay = init.delay ?? 0
    this.isImmediate = init.isImmediate ?? false
    this.rangeType = init.rangeType ?? RangeType.OVERSHOOT
    this.rangeExtra = init.rangeExtra ?? []
    this.fromSpeed = init.fromSpeed
    this.rangeCallback = init.rangeCallback
    const r: [number, number] = init.range ? [...init.range] : [...DEFAULT_RANGE]
    if (r[0] > r[1]) [r[0], r[1]] = [r[1], r[0]]
    this.range = r
  }

  /** 延迟结束后调用: 配置 Ani 并启动 */
  begin(ani: Ani): void {
    this.ani = ani
    ani.status = AniStatus.STOPPED
    const forces = this.isImmediate ? [new Immediate()] : this.ease
    this.setupDriver(forces, ani.value, this.target)
    if (this.fromSpeed !== undefined) ani.speed = this.fromSpeed
    ani.status = AniStatus.PLAYING
    this.status = AniRequestStatus.PLAYING
  }

  /** 每帧推进: 物理/缓动 + 边界 + 收敛 */
  update(dt: number): void {
    if (this.status !== AniRequestStatus.PLAYING || !this.ani) return
    this.ani.next(dt)
    if (this.ani.driver && Array.isArray(this.ani.driver)) this.checkRange()
    this.ani.checkFinished()
    if (this.ani.status === AniStatus.STOPPED) this.status = AniRequestStatus.COMPLETED
  }

  // ── 内部方法 ──

  /** 配置 Ani 的 driver (缓动 or 物理力管线) */
  private setupDriver(forces: (IForce | IEasing)[], from: number, to: number): void {
    const ani = this.ani!
    if (forces.length === 0) forces = [new Spring(...DEFAULT_SPRING)]
    for (const f of forces) if (f.target !== undefined) f.target = to

    // Immediate 优先: 有 Immediate 时不进入 easing 模式
    const hasImmediate = forces.some(f => f instanceof Immediate)
    const easing = hasImmediate ? undefined : forces.find(isIEasing)
    if (easing) {
      easing.fromValue = from; easing.toValue = to
      ani.driver = easing
    } else {
      ani.driver = forces as IForce[]
    }
    ani.updateForceInfo()
  }

  /** 边界检查: 值超出 range 时按 rangeType 处理 */
  private checkRange(): void {
    const ani = this.ani!
    const [lo, hi] = this.range
    if (ani.value >= lo && ani.value <= hi) return
    const edge = ani.value < lo ? lo : hi

    if (this.rangeType === RangeType.STOP) {
      ani.value = edge; ani.speed = 0
    } else if (this.rangeType === RangeType.OVERSHOOT) {
      this.overshoot(edge)
    } else if (this.rangeType === RangeType.REBOUND) {
      ani.value = edge; ani.speed *= -(this.rangeExtra[0] ?? 1)
    } else if (this.rangeCallback) {
      this.rangeCallback(ani)
    }
  }

  /** 越界回弹: 弹簧将值拉回边界 */
  private overshoot(edge: number): void {
    const [d, r] = this.rangeExtra.length >= 2
      ? [this.rangeExtra[0], this.rangeExtra[1]]
      : Math.abs(this.ani!.speed) < 1000 ? [1, 0.3] : [1, 0.4]
    this.setupDriver([new Spring(d, r)], 0, edge)
    this.range = [...DEFAULT_RANGE]
  }
}

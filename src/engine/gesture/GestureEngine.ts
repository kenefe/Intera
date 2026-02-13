// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GestureEngine —— 手势识别引擎
//  职责: 完整手势判定 (click / longClick / drag)
//  参考: MouseAction.as
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { TouchInfo, TouchCallbacks, TouchConfig, SpeedInfo } from './types'
import { SpeedTracker } from './SpeedTracker'

// ── 默认配置 ──

const DEFAULTS: TouchConfig = {
  moveDistanceThreshold: 30,
  clickTimeThreshold: 400,
  longClickTimeThreshold: 400,
}

// ── 工具函数 ──

function dist(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy)
}

/** 速度向量 → 角度 (0-360, 顺时针, 0=右) */
function toAngle(s: SpeedInfo): number {
  const deg = Math.atan2(s.y, s.x) * 180 / Math.PI
  return deg <= 0 ? -deg : 360 - deg
}

/** 创建空白 TouchInfo */
function createInfo(): TouchInfo {
  return {
    hasDown: false, hasStartMove: false, hasMove: false,
    hasUp: false, isClick: false, hasLongClick: false,
    downX: 0, downY: 0, x: 0, y: 0, offsetX: 0, offsetY: 0,
    isHorizontal: null, isPositive: null, angle: 0,
    speed: { x: 0, y: 0, total: 0 },
    downTime: 0, duration: 0, history: [],
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GestureEngine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class GestureEngine {
  private config: TouchConfig
  private cb: TouchCallbacks
  private tracker = new SpeedTracker()
  private lcTimer: ReturnType<typeof setTimeout> | null = null
  readonly info: TouchInfo = createInfo()

  constructor(config?: Partial<TouchConfig>, callbacks?: TouchCallbacks) {
    this.config = { ...DEFAULTS, ...config }
    this.cb = callbacks ?? {}
  }

  /** 指针按下 */
  pointerDown(x: number, y: number): void {
    this.cancelLcTimer()
    const now = performance.now()
    Object.assign(this.info, createInfo(), {
      hasDown: true, downX: x, downY: y, x, y, downTime: now,
    })
    this.tracker.reset()
    this.tracker.push(x, y)
    this.info.history.push({ x, y, time: now })
    this.startLcTimer()
    this.cb.onDown?.(this.info)
  }

  /** 指针移动 */
  pointerMove(x: number, y: number): void {
    const t = this.info
    if (!t.hasDown) return
    t.x = x; t.y = y
    t.offsetX = x - t.downX; t.offsetY = y - t.downY
    this.tracker.push(x, y)
    t.speed = this.tracker.getSpeed()
    t.history.push({ x, y, time: performance.now() })
    this.checkStartMove()
    this.cb.onMove?.(t)
  }

  /** 指针抬起 */
  pointerUp(x: number, y: number): void {
    const t = this.info
    if (!t.hasDown) return
    t.x = x; t.y = y
    t.hasDown = false; t.hasUp = true
    t.offsetX = x - t.downX; t.offsetY = y - t.downY
    t.duration = performance.now() - t.downTime
    t.speed = this.tracker.getSpeed()
    t.angle = toAngle(t.speed)
    t.isClick = !t.hasMove && t.duration < this.config.clickTimeThreshold
    this.cancelLcTimer()
    if (t.hasMove) this.cb.onEndMove?.(t)
    this.cb.onUp?.(t)
    if (t.isClick) this.cb.onClick?.(t)
  }

  /** 销毁 */
  destroy(): void { this.cancelLcTimer() }

  // ── 内部方法 ──

  /** 首次 startMove 判定 */
  private checkStartMove(): void {
    const t = this.info
    if (t.hasStartMove) return
    if (dist(t.offsetX, t.offsetY) <= this.config.moveDistanceThreshold) return
    t.hasStartMove = true; t.hasMove = true
    t.isHorizontal = Math.abs(t.offsetX) > Math.abs(t.offsetY)
    t.isPositive = t.isHorizontal ? t.offsetX > 0 : t.offsetY > 0
    this.cancelLcTimer()
    this.cb.onStartMove?.(t)
  }

  /** 启动长按计时 */
  private startLcTimer(): void {
    this.lcTimer = setTimeout(() => {
      if (this.info.hasDown && !this.info.hasStartMove) {
        this.info.hasLongClick = true
        this.cb.onLongClick?.(this.info)
      }
    }, this.config.longClickTimeThreshold)
  }

  /** 取消长按计时 */
  private cancelLcTimer(): void {
    if (this.lcTimer !== null) { clearTimeout(this.lcTimer); this.lcTimer = null }
  }
}

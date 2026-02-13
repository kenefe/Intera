// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DragEngine —— 拖拽交互引擎
//  职责: begin/tick/end + overScroll + inertia + absorb
//  参考: FolmeDrag.as
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { ScrollConfig, DragCallbacks, AbsorbRange } from './types'
import type { ToConfig, SpecialConfig } from '../folme/types'
import { FolmeEase } from '../folme/FolmeEase'

// ── 常量 ──

const DRAG_LOG   = -4.2    // 摩擦力对数衰减系数
const LOW_SPEED  = 1000    // 低速阈值 — 低于此值不触发惯性 (px/s)
const REST_SPEED = 1e-4    // 动画停止速度
const SCREEN     = { x: 1080, y: 2340 } // 橡皮筋参考尺寸

// ── 纯函数 ──

/** iOS 橡皮筋衰减: f(x) = (x³/3 - x² + x) · range，导数 (x-1)² 平滑趋零 */
function rubberBand(offset: number, range: number): number {
  if (!range) return 0
  const s = offset >= 0 ? 1 : -1
  const p = Math.min(Math.abs(offset) / range, 1)
  return s * (p * p * p / 3 - p * p + p) * range
}

/** 摩擦力预测终点: value - (speed - restSpeed) / (friction · dragLog) */
function predictPos(val: number, spd: number, friction: number): number {
  if (Math.abs(spd) < LOW_SPEED) return val
  const rest = spd > 0 ? REST_SPEED : -REST_SPEED
  return val - (spd - rest) / (friction * DRAG_LOG)
}

/** 逆推摩擦系数: 使物体恰好停在 target */
function frictionTo(val: number, spd: number, target: number): number {
  const dis = target - val
  if (Math.abs(spd) < LOW_SPEED || spd * dis <= 0) return -1
  const rest = spd > 0 ? REST_SPEED : -REST_SPEED
  return -(spd - rest) / dis / DRAG_LOG
}

/** 预测位置是否命中吸附区 → 返回最近的吸附边 */
function findAbsorb(
  pred: number, range: [number, number], absorbs: AbsorbRange[],
): number | undefined {
  if (pred < range[0] || pred > range[1]) return undefined
  for (const [lo, hi] of absorbs) {
    if (pred >= lo && pred <= hi) return pred > (lo + hi) / 2 ? hi : lo
  }
  return undefined
}

// ── 默认配置 ──

const DEFAULTS: ScrollConfig = {
  axis: { x: true, y: true },
  range: { x: [-Infinity, Infinity], y: [-Infinity, Infinity] },
  overScroll: { x: [1, 1], y: [1, 1] },
  friction: 1 / 2.1,
  springDamping: 1, springResponse: 0.4,
  absorb: { x: [], y: [] },
}

// ── 返回类型 ──

/** scroll() 返回值，可直传 FolmeManager.to(state, config) */
export interface ScrollTarget {
  state: Record<string, number>
  config: ToConfig
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DragEngine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class DragEngine {
  private cfg: ScrollConfig
  private cb: DragCallbacks
  private fromX = 0; private fromY = 0
  private fromPtrX = 0; private fromPtrY = 0
  private spdX = 0; private spdY = 0
  x = 0; y = 0
  active = false

  constructor(config?: Partial<ScrollConfig>, callbacks?: DragCallbacks) {
    this.cfg = { ...DEFAULTS, ...config } as ScrollConfig
    this.cb = callbacks ?? {}
  }

  /** 拖拽开始: 记录起始位置 */
  begin(viewX: number, viewY: number, ptrX: number, ptrY: number): void {
    this.x = viewX; this.y = viewY
    this.fromX = viewX; this.fromY = viewY
    this.fromPtrX = ptrX; this.fromPtrY = ptrY
    this.active = true
    this.cb.onBegin?.(viewX, viewY)
  }

  /** 拖拽跟手: 计算新位置 (含 overScroll 橡皮筋) */
  tick(ptrX: number, ptrY: number): void {
    if (!this.active) return
    if (this.cfg.axis.x) this.x = this.clamp('x', this.fromX + ptrX - this.fromPtrX)
    if (this.cfg.axis.y) this.y = this.clamp('y', this.fromY + ptrY - this.fromPtrY)
    this.cb.onMove?.(this.x, this.y, this.x - this.fromX, this.y - this.fromY)
    this.cb.onUpdate?.(this.x, this.y)
  }

  /** 拖拽结束: 记录松手速度 */
  end(speedX: number, speedY: number): void {
    this.active = false
    this.spdX = speedX; this.spdY = speedY
    this.cb.onEnd?.(speedX, speedY)
  }

  /** 惯性滚动: 计算目标 + 曲线，返回可直传 folme.to() 的数据 */
  scroll(): ScrollTarget | null {
    const st: Record<string, number> = {}
    const sp: Record<string, SpecialConfig> = {}
    if (this.cfg.axis.x) this.buildAxis('x', this.x, this.spdX, st, sp)
    if (this.cfg.axis.y) this.buildAxis('y', this.y, this.spdY, st, sp)
    if (!Object.keys(st).length) return null
    return { state: st, config: { ease: FolmeEase.friction(this.cfg.friction), special: sp } }
  }

  /** 运行时更新配置 */
  updateConfig(patch: Partial<ScrollConfig>): void {
    Object.assign(this.cfg, patch)
  }

  // ── 内部方法 ──

  /** 创建回弹弹簧 */
  private spring() {
    return FolmeEase.spring(this.cfg.springDamping, this.cfg.springResponse)
  }

  /** overScroll 橡皮筋: 越界部分衰减，范围内直通 */
  private clamp(axis: 'x' | 'y', raw: number): number {
    const [lo, hi] = this.cfg.range[axis]
    const [osLo, osHi] = this.cfg.overScroll[axis]
    const scr = SCREEN[axis]
    if (raw > hi) return hi + rubberBand(raw - hi, scr) * osHi
    if (raw < lo) return lo - rubberBand(lo - raw, scr) * osLo
    return raw
  }

  /** 为单轴构建惯性目标 + 曲线 */
  private buildAxis(
    axis: 'x' | 'y', val: number, spd: number,
    st: Record<string, number>, sp: Record<string, SpecialConfig>,
  ): void {
    const range = this.cfg.range[axis]
    const pred = predictPos(val, spd, this.cfg.friction)
    const snap = findAbsorb(pred, range, this.cfg.absorb[axis])
    sp[axis] = { range, fromSpeed: spd }
    if (snap !== undefined) {
      const f = frictionTo(val, spd, snap)
      st[axis] = snap
      sp[axis].ease = (Math.abs(spd) < LOW_SPEED || f <= 0 || f > 1)
        ? this.spring() : FolmeEase.friction(f)
    } else if (pred <= range[0] || pred >= range[1]) {
      st[axis] = pred <= range[0] ? range[0] : range[1]
      sp[axis].ease = this.spring()
    } else {
      st[axis] = pred
    }
  }
}

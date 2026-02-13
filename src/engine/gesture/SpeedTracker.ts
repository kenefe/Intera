// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SpeedTracker —— 速度追踪器
//  职责: 采样历史位置，双样本法估算瞬时速度
//  参考: MouseAction.as → pushHistory + speed 计算
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { TrackPoint, SpeedInfo } from './types'

// ── 常量 ──

const MAX_HISTORY = 50   // 历史样本上限
const MIN_SPAN   = 30    // 长跨度最小时间 (ms)
const MAX_SPAN   = 100   // 长跨度最大时间 / 过期阈值 (ms)
const ZERO: SpeedInfo = { x: 0, y: 0, total: 0 }

// ── 双样本合成 ──

/** 帧间 vs 跨度: 同向取绝对值更大的，异向用跨度 */
function merge(frame: number, span: number): number {
  if (frame * span > 0) return Math.abs(frame) > Math.abs(span) ? frame : span
  return span
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SpeedTracker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SpeedTracker {
  private history: TrackPoint[] = []
  private sx = 0
  private sy = 0
  private st = 0

  /** 记录一个采样点 */
  push(x: number, y: number): void {
    this.history.push({ x, y, time: performance.now() })
    if (this.history.length > MAX_HISTORY) this.history.shift()
    this.calculate()
  }

  /** 当前速度 (像素/秒)，无新样本超过阈值自动归零 */
  getSpeed(): SpeedInfo {
    if (this.history.length < 2 || this.isStale()) return { ...ZERO }
    return { x: this.sx, y: this.sy, total: this.st }
  }

  /** 重置所有状态 */
  reset(): void {
    this.history.length = 0
    this.sx = this.sy = this.st = 0
  }

  // ── 内部方法 ──

  private isStale(): boolean {
    const last = this.history[this.history.length - 1]
    return !last || performance.now() - last.time > MAX_SPAN
  }

  /** 找 30-100ms 前的样本索引，找不到返回 -1 */
  private findSpan(last: TrackPoint): number {
    const h = this.history
    for (let i = h.length - 1; i >= 0; i--) {
      const dt = last.time - h[i].time
      if (dt > MIN_SPAN && dt < MAX_SPAN) return i
    }
    return -1
  }

  /** 双样本速度估算 */
  private calculate(): void {
    const h = this.history, n = h.length
    if (n < 2) { this.sx = this.sy = this.st = 0; return }

    const last = h[n - 1], prev = h[n - 2]
    const dtF = (last.time - prev.time) / 1000 || 1e-9
    const fx = (last.x - prev.x) / dtF, fy = (last.y - prev.y) / dtF

    let sx = fx, sy = fy
    const si = this.findSpan(last)
    if (si >= 0) {
      const s = (last.time - h[si].time) / 1000
      sx = (last.x - h[si].x) / s
      sy = (last.y - h[si].y) / s
    }

    this.sx = merge(fx, sx); this.sy = merge(fy, sy)
    this.st = Math.sqrt(this.sx ** 2 + this.sy ** 2)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FolmeManager —— 元素级动画管理器
//  to(state, config) → 多属性弹簧动画
//  移植自 com.kenefe.folme.FolmeManager (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { IForce, IEasing, ToConfig } from './types'
import { AniStatus, AniRequestStatus } from './types'
import { Timeline } from './Timeline'
import { Ani } from './Ani'
import { AniRequest } from './AniRequest'

// ── 工具函数 ──

/** 归一化 ease 为数组，每项克隆 (防止多属性共享同一实例互改 target) */
function cloneEase(ease?: IForce | IEasing | (IForce | IEasing)[]): (IForce | IEasing)[] {
  if (!ease) return []
  const arr = Array.isArray(ease) ? ease : [ease]
  return arr.map(f => f.clone())
}

// ── FolmeManager 类 ──

export class FolmeManager {
  private anis = new Map<string, Ani>()
  private active = new Map<string, AniRequest>()

  /** 获取/创建属性的 Ani 实例 */
  getAni(prop: string): Ani {
    let ani = this.anis.get(prop)
    if (!ani) { ani = new Ani(); this.anis.set(prop, ani) }
    return ani
  }

  /** 读取属性当前值 */
  getValue(prop: string): number { return this.getAni(prop).value }

  /** 动画过渡到目标状态 */
  to(state: Record<string, number>, config?: ToConfig): void {
    this.schedule(this.buildRequests(state, config), config)
  }

  /** 立即设置到目标状态 (同步，无动画) */
  setTo(state: Record<string, number>): void {
    for (const [prop, value] of Object.entries(state)) {
      this.interruptProp(prop)
      const ani = this.getAni(prop)
      ani.value = value; ani.speed = 0; ani.status = AniStatus.STOPPED
    }
  }

  /** 停止动画 (无参数则全部停止) */
  cancel(...props: string[]): void {
    const targets = props.length > 0 ? props : [...this.anis.keys()]
    for (const p of targets) {
      const ani = this.anis.get(p)
      if (ani) { ani.status = AniStatus.STOPPED; ani.speed = 0 }
      this.interruptProp(p)
      this.active.delete(p)
    }
  }

  // ── 内部方法 ──

  /** 解析 state + config → 每属性独立 AniRequest */
  private buildRequests(
    state: Record<string, number>, config?: ToConfig,
  ): Map<string, AniRequest> {
    const map = new Map<string, AniRequest>()
    for (const [prop, target] of Object.entries(state)) {
      const sp = config?.special?.[prop]
      map.set(prop, new AniRequest({
        target,
        ease: cloneEase(sp?.ease ?? config?.ease),
        delay: sp?.delay ?? config?.delay,
        isImmediate: config?.isImmediate,
        range: sp?.range,
        rangeType: sp?.rangeType,
        fromSpeed: sp?.fromSpeed,
      }))
    }
    return map
  }

  /** 中断属性上的旧动画 */
  private interruptProp(prop: string): void {
    const old = this.active.get(prop)
    if (old && old.status === AniRequestStatus.PLAYING) {
      old.status = AniRequestStatus.STOPPED
    }
  }

  /** 启动一批 AniRequest */
  private beginBatch(requests: Map<string, AniRequest>): void {
    for (const [prop, req] of requests) {
      if (req.status === AniRequestStatus.STOPPED) continue
      this.interruptProp(prop)
      req.begin(this.getAni(prop))
      this.active.set(prop, req)
    }
  }

  /** 调度: delay → begin → tick → complete */
  private schedule(requests: Map<string, AniRequest>, config?: ToConfig): void {
    const delay = (config?.delay ?? 0) * 1000
    let begun = false
    const tickId = Timeline.addRequest(dt => {
      if (!begun) { begun = true; this.beginBatch(requests) }
      this.tickBatch(requests, config, tickId, dt)
    }, delay)
  }

  /** 每帧 tick: 推进 + onUpdate 回调 + 完成检测 */
  private tickBatch(
    requests: Map<string, AniRequest>,
    config: ToConfig | undefined, tickId: number, dt: number,
  ): void {
    for (const [, req] of requests) req.update(dt)
    if (config?.onUpdate) config.onUpdate(this.collectValues(requests))
    if (!this.hasPlaying(requests)) {
      Timeline.remove(tickId); config?.onComplete?.()
    }
  }

  /** 收集批次中各属性的当前值 */
  private collectValues(requests: Map<string, AniRequest>): Record<string, number> {
    const v: Record<string, number> = {}
    for (const [prop] of requests) v[prop] = this.getAni(prop).value
    return v
  }

  /** 批次中是否还有 PLAYING 的请求 */
  private hasPlaying(requests: Map<string, AniRequest>): boolean {
    for (const [, r] of requests) if (r.status === AniRequestStatus.PLAYING) return true
    return false
  }
}

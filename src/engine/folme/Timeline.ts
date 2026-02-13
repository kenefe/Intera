// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Timeline —— 全局动画循环
//  rAF 驱动 · deltaTime · 时间缩放 · 自动启停
//  移植自 com.kenefe.folme.Timeline (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 每帧回调签名: 接收 deltaTime (毫秒) */
export type TickCallback = (dt: number) => void

/** 延迟请求 —— delay 耗尽后晋升为每帧回调 */
interface DelayedEntry {
  id: number
  callback: TickCallback
  remaining: number
}

// ── 状态 ──

const ticks = new Map<number, TickCallback>()
const waiting: DelayedEntry[] = []

let nextId = 1
let rafId = 0
let lastTime = 0
let _deltaTime = 0
let _currentTime = 0
let _timeScale = 1

/** 单帧 deltaTime 上限 (防止切后台回来的时间跳跃) */
const MAX_DELTA = 100

// ── 循环核心 ──

function tick(now: number): void {
  _deltaTime = Math.min(now - lastTime, MAX_DELTA) * _timeScale
  lastTime = now
  _currentTime += _deltaTime

  advanceWaiting()
  ticks.forEach(fn => fn(_deltaTime))

  // 还有工作就继续，否则自动停止
  rafId = (ticks.size > 0 || waiting.length > 0)
    ? requestAnimationFrame(tick)
    : 0
}

/** 推进等待队列: delay 耗尽的请求晋升为每帧回调 */
function advanceWaiting(): void {
  for (let i = waiting.length - 1; i >= 0; i--) {
    waiting[i].remaining -= _deltaTime
    if (waiting[i].remaining <= 0) {
      const entry = waiting.splice(i, 1)[0]
      ticks.set(entry.id, entry.callback)
    }
  }
}

// ── 自动启停 ──

function ensureRunning(): void {
  if (rafId !== 0) return
  lastTime = performance.now()
  rafId = requestAnimationFrame(tick)
}

function stopIfIdle(): void {
  if (ticks.size > 0 || waiting.length > 0) return
  if (rafId === 0) return
  cancelAnimationFrame(rafId)
  rafId = 0
}

// ── 公开 API ──

/** 注册每帧回调，返回唯一 ID (用于 remove) */
function add(fn: TickCallback): number {
  const id = nextId++
  ticks.set(id, fn)
  ensureRunning()
  return id
}

/** 注销回调 */
function remove(id: number): void {
  ticks.delete(id)
  stopIfIdle()
}

/**
 * 延迟请求: delay(ms) 后 callback 开始每帧执行
 * delay ≤ 0 时立即开始。返回 ID，等待期用 clearWaitingRequest 取消，
 * 执行期用 remove 停止
 */
function addRequest(callback: TickCallback, delay: number): number {
  const id = nextId++
  if (delay <= 0) {
    ticks.set(id, callback)
  } else {
    waiting.push({ id, callback, remaining: delay })
  }
  ensureRunning()
  return id
}

/** 取消尚在等待中的延迟请求 (已晋升为执行态的不受影响) */
function clearWaitingRequest(id: number): void {
  const idx = waiting.findIndex(w => w.id === id)
  if (idx !== -1) waiting.splice(idx, 1)
  stopIfIdle()
}

/** 设置时间缩放 (1=正常, 2=两倍速, 0.5=慢放) */
function setTimeScale(scale: number): void {
  _timeScale = scale
}

// ── 导出 ──

export const Timeline = {
  get deltaTime() { return _deltaTime },
  get currentTime() { return _currentTime },
  get timeScale() { return _timeScale },
  add,
  remove,
  addRequest,
  clearWaitingRequest,
  setTimeScale,
} as const

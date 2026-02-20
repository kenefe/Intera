// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Folme 动画引擎 —— 类型定义
//  移植自 com.kenefe.folme (AS3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 力 (Force) ──

/** 力的上下文信息 (每帧传递给力计算) */
export interface ForceInfo {
  isEasing: boolean
  immediateTarget?: number
  forceTarget?: number
  targetCount: number
  hasAcceleration: boolean
  hasPerlin: boolean
}

/** 力接口 —— 所有物理力的基类 */
export interface IForce {
  target?: number       // 有目标的力 (Spring) 设值，无目标的 (Friction) 不声明
  resultValue: number
  resultSpeed: number
  /** 根据当前值、速度、时间步长计算下一帧的值和速度 */
  getValueAndSpeed(
    value: number, speed: number, dt: number,
    info: ForceInfo, prev: ForceInfo | null
  ): void
  clone(): IForce
}

// ── 缓动插值 (IEasing) ──

/** 缓动插值器 —— 基于时间的插值，和物理力是两条路 */
export interface IEasing {
  fn: (t: number) => number
  duration: number      // 秒
  fromValue: number
  toValue: number
  progress: number      // 0~1
  target: number        // 兼容 IForce 接口

  /** 每帧推进 */
  next(deltaTime: number): void
  /** 是否结束 */
  isFinished(): boolean
  /** 当前值 */
  getValue(): number
  /** 克隆 (每个 AniRequest 需独立实例) */
  clone(): IEasing
}

// ── Ani (单属性动画实例) ──

export const AniStatus = {
  PLAYING: 0,
  STOPPED: 1,
} as const

export type AniStatusType = (typeof AniStatus)[keyof typeof AniStatus]

// ── AniRequest (动画请求) ──

export const AniRequestStatus = {
  WAITING: -1,    // delay 等待中
  PLAYING: 0,     // 执行中
  COMPLETED: 1,   // 自然结束
  STOPPED: 2,     // 被打断
} as const

export type AniRequestStatusType =
  (typeof AniRequestStatus)[keyof typeof AniRequestStatus]

/** 边界行为 */
export const RangeType = {
  STOP: 0,        // 到边界停下
  OVERSHOOT: 1,   // 弹回 (弹簧)
  REBOUND: 2,     // 反弹 (速度取反)
  CUSTOM: -1,     // 自定义回调
} as const

export type RangeTypeValue = (typeof RangeType)[keyof typeof RangeType]

// ── FolmeManager (元素级管理器) ──

/** to() 的配置参数 —— 对应 FolmeManager.as 的 config */
export interface ToConfig {
  /** 全局曲线 (所有属性的默认) */
  ease?: IForce | IEasing | (IForce | IEasing)[]

  /** 属性级曲线覆盖 (对应 AS3 的 config.special) */
  special?: Record<string, SpecialConfig>

  /** 延迟 (秒) */
  delay?: number

  /** 立即设值 (无动画) */
  isImmediate?: boolean

  /** 回调 */
  onUpdate?: RenderCallback
  onComplete?: CompleteCallback
}

/** 属性级特殊配置 */
export interface SpecialConfig {
  /** 该属性的曲线 */
  ease?: IForce | IEasing | (IForce | IEasing)[]

  /** 该属性的延迟 (秒) */
  delay?: number

  /** 该属性的边界范围 */
  range?: [number, number]

  /** 边界行为 */
  rangeType?: RangeTypeValue

  /** 初始速度 */
  fromSpeed?: number
}

/** 渲染回调: 属性名 → 当前值 */
export type RenderCallback = (values: Record<string, number>) => void
export type CompleteCallback = () => void

// ── 弹簧参数 ──

/** Apple 风格弹簧参数: response + damping */
export interface SpringConfig {
  damping: number   // 阻尼比 (0~1+, 1=临界阻尼)
  response: number  // 响应时间 (秒, 越小越快)
  mass?: number     // 质量 (默认1)
}

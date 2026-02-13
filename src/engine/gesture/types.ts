// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  触控引擎 —— 类型定义
//  移植自 MouseAction (AS3) + FolmeDrag (AS3)
//  触屏优先: Touch → Drag → Scroll
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 速度追踪 ──

export interface TrackPoint {
  x: number
  y: number
  time: number
}

export interface SpeedInfo {
  x: number
  y: number
  total: number
}

// ── Touch (原子触控事件) ──

/** 触控信息 —— 一次完整触控序列的全部数据 */
export interface TouchInfo {
  // 阶段
  hasDown: boolean
  hasStartMove: boolean
  hasMove: boolean
  hasUp: boolean
  isClick: boolean
  hasLongClick: boolean

  // 位置
  downX: number
  downY: number
  x: number
  y: number
  offsetX: number
  offsetY: number

  // 方向 (startMove 后才有值)
  isHorizontal: boolean | null
  isPositive: boolean | null
  angle: number

  // 速度
  speed: SpeedInfo

  // 时间
  downTime: number
  duration: number

  // 轨迹
  history: TrackPoint[]
}

/** Touch 回调集 (原子事件) */
export interface TouchCallbacks {
  onDown?: (info: TouchInfo) => void
  onStartMove?: (info: TouchInfo) => void
  onMove?: (info: TouchInfo) => void
  onUp?: (info: TouchInfo) => void
  onClick?: (info: TouchInfo) => void
  onLongClick?: (info: TouchInfo) => void
  onEndMove?: (info: TouchInfo) => void
}

/** Touch 配置 */
export interface TouchConfig {
  moveDistanceThreshold: number   // 判定 startMove 的最小距离 (px)
  clickTimeThreshold: number      // 判定 click 的最大时长 (ms)
  longClickTimeThreshold: number  // 判定长按的最小时长 (ms)
}

// ── Drag (跟手 + 惯性封装) ──

/** Drag 配置 */
export interface DragConfig {
  /** 渲染轴: 哪些轴跟手 */
  axis: { x: boolean; y: boolean }

  /** 范围约束 */
  range: { x: [number, number]; y: [number, number] }

  /** 超出范围的橡皮筋系数 (0=无, 1=完全跟手) */
  overScroll: { x: [number, number]; y: [number, number] }

  /** 惯性滚动的摩擦力 */
  friction: number

  /** 惯性滚动时的弹簧参数 (回弹用) */
  springDamping: number
  springResponse: number
}

/** Drag 回调 */
export interface DragCallbacks {
  onBegin?: (x: number, y: number) => void
  onMove?: (x: number, y: number, offsetX: number, offsetY: number) => void
  onEnd?: (speedX: number, speedY: number) => void
  onUpdate?: (x: number, y: number) => void
}

// ── Scroll (Drag + absorb 封装) ──

/** 吸附区间: 滚动到此范围内会吸附到最近的边 */
export type AbsorbRange = [number, number]

/** Scroll 配置 (继承 Drag，添加 absorb) */
export interface ScrollConfig extends DragConfig {
  /** 吸附点列表 */
  absorb: { x: AbsorbRange[]; y: AbsorbRange[] }
}

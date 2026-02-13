// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Folme 动画引擎 —— 统一入口
//  import { FolmeManager, FolmeEase } from '@engine/folme'
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 核心 API ──

export { FolmeManager } from './FolmeManager'
export { FolmeEase } from './FolmeEase'
export { Timeline } from './Timeline'

// ── 力 & 缓动 (高级用法 / Phase 2 DragEngine) ──

export { Spring } from './forces/Spring'
export { Friction } from './forces/Friction'
export { Immediate } from './forces/Immediate'
export { Easing, Interpolator, bezierEasing } from './Easing'

// ── 内部构件 (FolmeManager 的组成部分) ──

export { Ani } from './Ani'
export { AniRequest } from './AniRequest'

// ── 类型 ──

export type {
  IForce, IEasing, ForceInfo,
  ToConfig, SpecialConfig, SpringConfig,
  RenderCallback, CompleteCallback,
  AniStatusType, AniRequestStatusType, RangeTypeValue,
} from './types'

export { AniStatus, AniRequestStatus, RangeType } from './types'
export type { AniDriver } from './Ani'
export type { AniRequestInit } from './AniRequest'
export type { EasingFn } from './Easing'
export type { TickCallback } from './Timeline'

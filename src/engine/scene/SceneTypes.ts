// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SceneTypes —— 图层树 + 显示状态 + 布局
//  纯类型定义，零逻辑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 基础类型 ──

export interface Vec2 { x: number; y: number }
export interface Size { width: number; height: number }

// ── 图层类型 ──

export type LayerType =
  | 'frame' | 'rectangle' | 'ellipse' | 'text' | 'image' | 'group' | 'instance'

// ── 可动画属性 ──

export interface AnimatableProps {
  x: number; y: number; width: number; height: number
  rotation: number; scaleX: number; scaleY: number
  opacity: number; borderRadius: number
  fill: string; stroke: string; strokeWidth: number
}

// ── 布局属性 ──

export type LayoutDirection = 'free' | 'horizontal' | 'vertical'
export type SizeMode = 'fixed' | 'fill' | 'hug'
export type Alignment = 'start' | 'center' | 'end' | 'stretch'
export type JustifyContent =
  | 'start' | 'center' | 'end' | 'space-between' | 'space-around'

export interface LayoutProps {
  layout: LayoutDirection
  gap: number
  padding: [number, number, number, number]
  alignItems: Alignment
  justifyContent: JustifyContent
  clipContent: boolean
  widthMode: SizeMode
  heightMode: SizeMode
}

// ── 图层节点 ──

export interface Layer {
  id: string
  name: string
  type: LayerType
  parentId: string | null
  childrenIds: string[]
  visible: boolean
  locked: boolean
  props: AnimatableProps
  layoutProps: LayoutProps
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  textAlign?: string
  imageSrc?: string
  // ── instance 专用 ──
  componentId?: string
  instanceOverrides?: Record<string, Partial<AnimatableProps & { text?: string; imageSrc?: string }>>
}

// ── 曲线配置 ──

export type CurveType = 'spring' | 'friction' | 'bezier' | 'linear'

export interface CurveConfig {
  type: CurveType
  damping?: number
  response?: number
  friction?: number
  controlPoints?: [number, number, number, number]
  duration?: number
}

// ── 过渡 + 显示状态 ──

export interface TransitionConfig {
  curve: CurveConfig
  elementCurves?: Record<string, CurveConfig>
  propertyCurves?: Record<string, Record<string, CurveConfig>>
  delays?: Record<string, number>
}

export interface DisplayState {
  id: string
  name: string
  overrides: Record<string, Partial<AnimatableProps>>
  transition: TransitionConfig
}

// ── 状态组 ──

export interface StateGroup {
  id: string
  name: string
  rootLayerId: string | null
  displayStates: DisplayState[]
  activeDisplayStateId: string | null
}

// ── 逻辑变量 ──

export type VariableType = 'boolean' | 'number' | 'string' | 'enum' | 'color'
export type VariableValue = boolean | number | string

export interface Variable {
  id: string
  name: string
  type: VariableType
  defaultValue: VariableValue
  options?: string[]
}

// ── 组件定义 ──

export interface ComponentDef {
  id: string
  name: string
  rootLayerId: string
  stateGroupId: string
  patchIds: string[]
  exposedProps: Record<string, (keyof AnimatableProps | 'text' | 'imageSrc')[]>
}

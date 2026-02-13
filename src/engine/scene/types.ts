// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  场景图 —— 类型定义
//  图层树 + 显示状态 + 布局 + Patch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 基础类型 ──

export interface Vec2 { x: number; y: number }
export interface Size { width: number; height: number }

// ── 图层类型 ──

export type LayerType =
  | 'frame'       // 容器 (可嵌套, 可布局)
  | 'rectangle'   // 矩形
  | 'ellipse'     // 椭圆
  | 'text'        // 文本
  | 'image'       // 图片
  | 'group'       // 分组

// ── 可动画属性 ──
//
// 这些属性可以在显示状态之间平滑过渡
// 对应 folme.to() 可以操作的属性

export interface AnimatableProps {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
  borderRadius: number
  fill: string
  stroke: string
  strokeWidth: number
}

// ── 布局属性 ──
//
// 结构性属性，定义图层如何排列子元素、如何适应父级
// 不参与状态间动画，而是影响布局引擎的行为

/** 布局方向 (作为父级时，子元素怎么排列) */
export type LayoutDirection = 'free' | 'horizontal' | 'vertical'

/** 尺寸模式 (作为子级时，怎么决定自己的大小) */
export type SizeMode = 'fixed' | 'fill' | 'hug'

/** 对齐方式 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch'

/** 交叉轴分布 */
export type JustifyContent =
  | 'start' | 'center' | 'end' | 'space-between' | 'space-around'

export interface LayoutProps {
  // ── 作为父级 ──
  layout: LayoutDirection         // 子元素排列方式
  gap: number                     // 子元素间距
  padding: [number, number, number, number]  // 内边距 [上,右,下,左]
  alignItems: Alignment           // 交叉轴对齐
  justifyContent: JustifyContent  // 主轴分布
  clipContent: boolean            // 是否裁切超出内容

  // ── 作为子级 ──
  widthMode: SizeMode             // 宽度: 固定 / 撑满父级 / 包裹内容
  heightMode: SizeMode            // 高度: 固定 / 撑满父级 / 包裹内容
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

  /** 默认可动画属性 (DisplayState "默认" 的快照) */
  props: AnimatableProps

  /** 布局属性 (结构性，不参与状态间动画) */
  layoutProps: LayoutProps

  // 文本专用
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  textAlign?: string

  // 图片专用
  imageSrc?: string
}

// ── 显示状态 (关键帧) ──
//
// 核心: 所有状态共享同一棵图层树，每个状态只存差异
// 对应 folme.to('stateName') — 具名目标状态

export interface DisplayState {
  id: string
  name: string

  /** 属性覆盖: layerId → 与默认不同的属性 */
  overrides: Record<string, Partial<AnimatableProps>>

  /** 到达此状态时的过渡配置 */
  transition: TransitionConfig
}

/** 过渡配置 —— "到达此状态时怎么动" */
export interface TransitionConfig {
  /** 全局默认曲线 */
  curve: CurveConfig

  /** 元素级覆盖: layerId → 该元素的曲线 */
  elementCurves?: Record<string, CurveConfig>

  /** 属性级覆盖: layerId → propName → 曲线 (对应 config.special) */
  propertyCurves?: Record<string, Record<string, CurveConfig>>

  /** 元素级延迟: layerId → delay(ms)，做交错动画 */
  delays?: Record<string, number>
}

// ── 曲线配置 ──

export type CurveType = 'spring' | 'friction' | 'bezier' | 'linear'

export interface CurveConfig {
  type: CurveType
  damping?: number     // spring
  response?: number    // spring
  friction?: number    // friction
  controlPoints?: [number, number, number, number]  // bezier
  duration?: number    // bezier / linear
}

// ── 状态组 ──

export interface StateGroup {
  id: string
  name: string
  rootLayerId: string | null  // null = 主画面
  displayStates: DisplayState[]
  activeDisplayStateId: string | null
}

// ── 逻辑变量 ──
//
// 逻辑状态也用具名值: cardState: "collapsed" | "expanded" | "loading"
// 比 boolean 更容易扩展个数和类型

export type VariableType = 'boolean' | 'number' | 'string' | 'enum' | 'color'
export type VariableValue = boolean | number | string

export interface Variable {
  id: string
  name: string
  type: VariableType
  defaultValue: VariableValue

  /** enum 类型的可选值列表 (如 ["collapsed", "expanded", "loading"]) */
  options?: string[]
}

// ── Patch 连线 ──
//
// 触发器: 原始触控事件 (down/startMove/move/up) + 封装 (drag/scroll)
// 动作: 统一为 to / setTo，目标可以是具名状态或内联属性
//
// 核心洞察:
//   folme.to('expanded')    = 具名关键帧
//   folme.to({ x: 100 })   = 内联关键帧 (匿名)
//   两者本质相同: "描述目标状态，过去"

export type PatchType =
  // 触发器 — 原始触控事件 (触屏优先)
  | 'touch'               // down / startMove / move / up
  // 触发器 — 封装
  | 'drag'                // 跟手 + 惯性 (封装 touch + folme)
  | 'scroll'              // 拖拽滚动 (封装 drag + range + overscroll)
  | 'timer'               // 定时器
  | 'variableChange'      // 变量变化触发
  // 逻辑
  | 'condition'           // 条件分支
  | 'toggleVariable'      // 布尔变量取反
  | 'delay'               // 延迟
  | 'counter'             // 计数器
  // 动作 — 统一的 to / setTo
  | 'to'                  // → folme.to(): 弹簧动画到目标 (具名状态 or 内联属性)
  | 'setTo'               // ⇒ folme.setTo(): 立即到位
  | 'setVariable'         // 设置逻辑变量

export interface PatchPort {
  id: string
  name: string
  dataType: 'pulse' | 'boolean' | 'number' | 'string' | 'vec2'
}

export interface Patch {
  id: string
  type: PatchType
  name: string
  position: Vec2
  config: Record<string, unknown>
  inputs: PatchPort[]
  outputs: PatchPort[]
}

export interface PatchConnection {
  id: string
  fromPatchId: string
  fromPortId: string
  toPatchId: string
  toPortId: string
}

// ── 项目数据模型 ──

export interface Project {
  id: string
  name: string
  canvasSize: Size
  layers: Record<string, Layer>
  rootLayerIds: string[]
  stateGroups: StateGroup[]
  variables: Variable[]
  patches: Patch[]
  connections: PatchConnection[]
}

# Intera — 架构文档

## 产品定位

交互意图编辑器。画布上设计 UI → 定义状态和逻辑 → 弹簧动效自动过渡 → 导出代码/视频。

**不做时间轴。** 面向 UI 交互，曲线 + delay 足矣。

---

## 核心概念

### 统一状态模型

```
一切都是 "描述目标状态，过去":
  folme.to('Card/展开')           ← 具名关键帧 (预定义的显示状态)
  folme.to({ scaleX: 0.95 })     ← 内联关键帧 (匿名，Patch 里当场定义)
  folme.to({ y: dragOffset })    ← 动态值 (来自触控数据)
  folme.setTo(...)               ← 同上，但立即到位无动画
```

**显示状态** (DisplayState) = 具名关键帧，视觉快照，共享图层树，只存覆盖差异。
**逻辑变量** (Variable) = 支持 boolean/number/string/**enum**/color。
  推荐 enum: `cardState: "collapsed" | "expanded" | "loading"` — 比 boolean 更易扩展。
**内联属性** = 匿名关键帧，直接在 Patch to 节点里描述目标。

**流向**:
```
Touch 原子事件 (down/startMove/move/up)
    │
    ├──► 逻辑变量变化 → 条件 → to(具名状态)    ← 经过逻辑
    └──► 直接 to(内联属性)                     ← 不经过逻辑
```

### 关键帧模型

```
共享图层树 (唯一一棵)
    │
    ├── DisplayState "默认"  → { 元素A: {}, 元素B: {x:0} }
    ├── DisplayState "展开"  → { 元素A: {height:300}, 元素B: {x:100} }
    └── DisplayState "加载"  → { 元素B: {opacity:0.5} }
```

- 所有状态共享**同一棵图层树**
- 每个状态只存**关键元素的关键属性差异**
- 没有覆盖的属性 = 使用默认值

### 曲线配置 (三级覆盖)

```
全局曲线          → spring(0.95, 0.35)
  元素级覆盖      → 元素A: spring(1, 0.2)
    属性级覆盖    → 元素A.opacity: friction(1/2.1)
```

对应 Folme 的 `config.ease` (全局) 和 `config.special` (属性级)。

---

## 三层架构

```
┌──────────────────────────────────────────┐
│  UI 层 (Vue 3 + Pinia)                  │
│  画布 / 属性面板 / 状态栏 / Patch 编辑器   │
│  只调用 Engine 和 Renderer 接口           │
└──────────────────┬───────────────────────┘
                   │ 调用
┌──────────────────▼───────────────────────┐
│  Engine 核心                              │
│  ┌──────────────┐ ┌─────────────────┐    │
│  │ folme/       │ │ gesture/        │    │
│  │ Timeline     │ │ GestureEngine   │    │
│  │ Ani          │ │ DragEngine      │    │
│  │ FolmeManager │ │ SpeedTracker    │    │
│  │ Forces       │ └─────────────────┘    │
│  └──────────────┘                        │
│  ┌──────────────┐ ┌─────────────────┐    │
│  │ scene/       │ │ state/          │    │
│  │ SceneGraph   │ │ VariableManager │    │
│  │ DisplayState │ │ PatchRuntime    │    │
│  │ SmartAnimate │ │ SugarPresets    │    │
│  └──────────────┘ └─────────────────┘    │
└──────────────────┬───────────────────────┘
                   │ 调用
┌──────────────────▼───────────────────────┐
│  Renderer 层 (可替换)                     │
│  DOMRenderer ← 唯一实现 (v1)             │
│  WebGPURenderer  ← 未来 (v2)             │
└──────────────────────────────────────────┘
```

**依赖铁律**:
- Engine 零 UI 依赖 (不 import Vue / DOM / Pinia)
- UI 层不直接操作 DOM 图层 (通过 Renderer 接口)
- Engine 内部：folme/ 不依赖 scene/, gesture/ 不依赖 folme/

---

## 图层布局系统

图层支持嵌套，每个 Frame 类型图层可以定义子元素的排列和自身的尺寸行为。

### 作为父级 (定义子元素如何排列)

| 属性 | 值 | 说明 |
|------|-----|------|
| layout | `free` / `horizontal` / `vertical` | 自由定位 / 水平排列 / 垂直排列 |
| gap | number | 子元素间距 |
| padding | [上,右,下,左] | 内边距 |
| alignItems | `start` / `center` / `end` / `stretch` | 交叉轴对齐 |
| justifyContent | `start` / `center` / `end` / `space-between` | 主轴分布 |
| clipContent | boolean | **是否裁切超出内容** |

### 作为子级 (定义自身如何适应父级)

| 属性 | 值 | 说明 |
|------|-----|------|
| widthMode | `fixed` / `fill` / `hug` | 固定宽度 / 撑满父级 / 包裹内容 |
| heightMode | `fixed` / `fill` / `hug` | 固定高度 / 撑满父级 / 包裹内容 |

布局属性是**结构性的**，不参与显示状态间的动画过渡。
可动画属性 (x, y, width, height, opacity, scale...) 才是状态切换时 folme.to() 操作的对象。

---

## 触控事件层级

触屏优先，三层抽象：

```
Touch (原子)         Drag (封装)           Scroll (高级封装)
down/startMove/      begin → tick →        Drag + range +
move/up              end → scroll          overscroll + absorb
  │                    │                      │
  └── 最大灵活度       └── 常见拖拽场景        └── 列表/页面滚动
```

在 Patch 编辑器中:
- Touch 节点: 输出原始 down/startMove/move/up，设计师自由组合
- Drag 节点: 封装跟手+惯性，可配置 axis/range/overscroll
- Scroll 节点: 最高封装，Drag + absorb 吸附点

### Behavior 节点 (第四类)

Behavior 是有状态的交互行为封装，区别于无状态的 trigger/logic/action：

```
behaviorDrag   → 封装 FolmeDrag，配置 axis/range/snapPoints
                 输出 start/end/snap 脉冲
behaviorScroll → 封装滚动行为，配置 axis/range/overscroll/snapPoints
                 输出 start/end/snap 脉冲
```

- 有 create/destroy 生命周期 (BehaviorManager 管理)
- 保持 pulse-only，不引入数据流
- UI 分类: `behavior` (紫色)

---

## 目录结构

```
src/
├── engine/                 # 核心引擎 (零 UI 依赖)
│   ├── folme/              # 动画引擎 (移植自 AS3)
│   │   ├── types.ts        # 引擎类型定义
│   │   ├── Timeline.ts     # 全局 rAF 循环
│   │   ├── Ani.ts          # 单属性动画实例
│   │   ├── AniRequest.ts   # 动画请求 (delay/range/曲线)
│   │   ├── FolmeManager.ts # 元素级管理器 (to/setTo/cancel)
│   │   ├── FolmeEase.ts    # 曲线工厂
│   │   ├── forces/         # 物理力
│   │   │   ├── Spring.ts
│   │   │   ├── Friction.ts
│   │   │   └── Immediate.ts
│   │   └── index.ts
│   │
│   ├── gesture/            # 触控引擎 (移植自 MouseAction + FolmeDrag)
│   │   ├── types.ts        # 触控类型定义
│   │   ├── SpeedTracker.ts # 速度追踪
│   │   ├── TouchEngine.ts  # 原子触控 (down/startMove/move/up)
│   │   ├── DragEngine.ts   # 拖拽封装 (跟手 + 惯性)
│   │   └── ScrollEngine.ts # 滚动封装 (Drag + range + overscroll + absorb)
│   │
│   ├── scene/              # 场景图
│   │   ├── types.ts        # 类型 barrel (re-export)
│   │   ├── SceneTypes.ts   # 图层/状态/曲线类型
│   │   ├── PatchTypes.ts   # Patch 节点 discriminated union 类型
│   │   ├── SceneGraph.ts   # 图层树操作
│   │   ├── DisplayState.ts # 显示状态管理
│   │   └── SmartAnimate.ts # 状态间差异过渡
│   │
│   ├── idFactory.ts        # 统一 ID 生成工厂
│   │
│   └── state/              # 交互逻辑
│       ├── VariableManager.ts  # 逻辑变量
│       ├── PatchRuntime.ts     # Patch 执行引擎 (Map 索引 + 定时器管理)
│       ├── PatchDefs.ts        # 节点端口定义 + 工厂
│       ├── BehaviorManager.ts  # Behavior 节点生命周期管理
│       └── SugarPresets.ts     # 交互预设模板
│
├── renderer/               # 渲染器抽象
│   ├── types.ts            # Renderer 接口
│   └── DOMRenderer.ts      # DOM 实现
│
├── store/                  # Pinia Stores
│   ├── project.ts          # 项目数据 (图层树/状态/Patch)
│   ├── canvas.ts           # 画布视口
│   └── editor.ts           # 编辑模式/工具
│
├── components/             # Vue 组件
│   ├── canvas/             # 画布区
│   │   ├── CanvasViewport.vue
│   │   ├── Artboard.vue
│   │   ├── StateBar.vue
│   │   └── PreviewMode.vue
│   ├── panels/             # 面板
│   │   ├── LayerPanel.vue
│   │   ├── PropertiesPanel.vue
│   │   ├── CurvePanel.vue
│   │   └── KeyPropertyPanel.vue
│   └── patch/              # Patch 编辑器
│       ├── PatchCanvas.vue
│       ├── PatchNode.vue
│       └── PatchVarPanel.vue
│
├── composables/            # Vue Composables
│   ├── useLayerInteraction.ts
│   ├── useDrawTool.ts
│   ├── useTextTool.ts
│   └── usePreviewGesture.ts
│
├── App.vue
└── main.ts
```

---

## 数据流

### 编辑时

```
用户拖拽图层             用户切换显示状态           用户修改曲线参数
    │                        │                        │
    ▼                        ▼                        ▼
Canvas Store             Project Store             Project Store
(selectedIds, pos)       (activeDisplayStateId)    (curves.global/element/property)
    │                        │
    ▼                        ▼
DOMRenderer.updateLayer  Artboard 高亮当前状态
```

### 预览时 (核心交互链路)

```
用户手指 / 鼠标
    │
    ▼
GestureEngine (click? drag? hover? longClick?)
    │
    ▼
PatchRuntime 执行触发器
    │
    ├─▶ VariableManager.set('isOpen', true)   ← 逻辑状态变化
    │       │
    │       ▼
    │   PatchRuntime 检查条件 → 触发动作
    │       │
    │       ▼
    │   SmartAnimate.transition('展开状态')    ← 仅切换 previewStateByGroupId (不写编辑态)
    │       │
    │       ▼
    │   FolmeManager.to(diff, curveConfig)     ← 弹簧动效
    │       │
    │       ▼
    │   DOMRenderer.updateLayer() ← 每帧更新
    │
    └─▶ 直接 FolmeManager.to()  ← 不经过逻辑状态 (mouseDown 反馈等)
```

### 预览时 (Behavior 拖拽链路)

```
PreviewPanel pointer events (down/move/up)
    │
    ▼
usePreviewGesture.layerIdFrom(e)  ← e.target.closest('[data-layer-id]')
    │
    ▼
BehaviorManager.findByLayer(layerId)  ← 实时读取 PatchDefs config (不缓存)
    │
    ▼
DragEngine.begin/tick/end  ← 跟手 + 惯性
    │
    ▼
projectStore.liveValues[layerId]  ← 实时位置
    │
    ▼
DOMRenderer watchEffect  ← 每帧渲染
```

注: Preview 和 Canvas 的状态/动画通道均已解耦:
- Canvas(编辑态): `group.activeDisplayStateId` + `liveValues/liveStateId`
- Preview(播放态): `previewStateByGroupId` + `previewLiveValues/previewLiveStateId`
避免播放时污染关键帧编辑上下文或让画布跟播中间帧。

---

## 关键设计决策

### DOM 渲染

- 一个图层 = 一个 div + CSS transform/style
- 优势: 原生事件、文本渲染、CSS 属性即导出物
- 抽象: Renderer 接口隔离，未来可换 WebGPU

### 弹簧动画

- 默认曲线: `spring(0.95, 0.35)` (Folme 实战默认值)
- Apple 风格参数: `response` (响应时间/秒) + `damping` (阻尼比/0~1+)
- 物理模拟: 每帧计算力→加速度→速度→位置，自然收敛
- 判停: `|speed| < threshold && |value - target| < minVisibleChange`

### Patch 编辑器

- 节点图，类 Origami 但大幅简化
- 只做 UI 交互常见的: 触发器 (tap/drag/hover/scroll) + 逻辑 (条件/toggle/delay) + 动作 (切换状态/设置变量)
- Sugar 预设一键生成 80% 场景

### 视频导出 (Phase 9)

- 离线逐帧渲染: 暂停 rAF → 手动步进 → html-to-image 光栅化 → WebCodecs 编码
- 要求动画引擎可时间寻址 (seekTo)

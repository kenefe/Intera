# Intera — 产品愿景

## 一句话定义

**Intera 是一个交互意图编辑器 (Interaction Intent Editor)。**

在画布上设计 UI → 定义状态和交互逻辑 → 弹簧动效自动生成 → 导出 Web 生产代码和视频。

---

## 我们要解决的问题

现有交互动效工具都存在一个根本矛盾：**易用的不够强大，强大的不够易用。**

| 工具 | 优势 | 致命缺陷 |
|------|------|---------|
| Principle | 极简，5 分钟上手 | 能力太弱，无逻辑分支 |
| ProtoPie | 交互逻辑完整 | 不出生产代码，复杂链路变意大利面 |
| Origami | 表达能力最强 (节点图) | 学习曲线陡峭，程序员思维 |
| Rive | 生产级运行时 | 只做组件级动效，不做全流程 |
| Adobe Animate | 时间轴动画之王 | 上一代工具，不是 UI 思维 |
| Figma | 设计+原型一体 | 动效能力太弱太粗 |

**没有任何一个工具同时做到：易用 + 强大 + 出生产代码。**

---

## 核心洞察

> **动效不是「怎么做动画」，而是「怎么描述交互意图」。**
>
> UI 交互的本质是：用户操作 → 逻辑状态变化 → 视觉状态过渡。
> Intera 让设计师直接描述这三步，系统自动生成高品味动效。

---

## 我们的经验：Folme + MouseAction 工作流

Intera 的设计源自多年使用 Adobe Animate + 代码 做交互动效的实战经验：

### 实际工作流 (代码时代)

```
1. MouseAction 检测手势 (tap / drag / hover / longClick)
2. 手势触发逻辑状态变化 (isOpen = true, currentTab = 2)
3. 逻辑状态驱动 folme.to('展开状态') — 弹簧动效自动过渡
4. 有时也直接 folme.to() — 比如 mouseDown 缩放反馈，不经过逻辑状态
```

### Folme 的状态模型

```javascript
// 视图上定义多个状态 (本质就是关键帧)
view.collapsed = { height: 80, opacity: 1, borderRadius: 12 }
view.expanded  = { height: 300, opacity: 1, borderRadius: 8 }

// 动画过渡到目标状态
view.folme.to('expanded')           // 弹簧动画到展开状态
view.folme.to('collapsed', config)  // 带自定义曲线的过渡
view.folme.to('x', 100)             // 单属性动画
view.folme.setTo('collapsed')       // 立即跳到状态（无动画）
```

这套模式的核心优势：
- **声明式**：描述目标状态，不描述动画过程
- **物理驱动**：弹簧动效自然流畅
- **灵活组合**：不是所有属性都要变，只变需要变的
- **特殊曲线**：config.special 可以对单个属性 override 曲线

### Intera 要做的就是把这套代码工作流变成可视化工具。

---

## 两种状态：逻辑状态 vs 显示状态

这是 Intera 最重要的概念区分：

### 逻辑状态 (Logic State) = 变量

```
isOpen: boolean = false
currentTab: number = 0
status: string = "idle"
```

- 纯逻辑，不直接对应视觉
- 用于条件判断和交互逻辑
- 交互触发 → 改变逻辑状态 → 逻辑状态驱动显示状态切换

### 显示状态 (Display State) = 关键帧 = Folme 的 state

```
默认状态:  { height: 80, opacity: 1, borderRadius: 12 }
展开状态:  { height: 300, opacity: 1, borderRadius: 8 }
```

- 具体的视觉快照
- **所有显示状态共享同一棵图层树**（toumo 的好思路）
- 每个显示状态只记录**与默认状态不同的属性** (覆盖/override)
- 不是所有元素都要在每个状态里变化 → **关键元素 + 关键属性**
- 每个状态可以有自己的动画曲线配置 (到达此状态时使用的曲线)
- 属性级别可以 override 曲线 (对应 Folme 的 config.special)

### 数据流

```
用户交互 (tap/drag/hover)
    │
    ▼
逻辑状态变化 (isOpen = true)
    │
    ▼
触发显示状态切换 (默认 → 展开)
    │
    ▼
Folme.to(展开状态的属性覆盖, 该状态的曲线配置)
    │
    ▼
弹簧动效平滑过渡
```

有时候也会**直接 to()**，不经过逻辑状态：
- 按下缩小反馈 (Sugar 预设)
- 拖拽跟手 (FolmeDrag)
- 直接属性动画

### 统一状态模型

**核心洞察：具名状态和内联属性本质相同，都是"描述目标，过去"。**

```javascript
folme.to('expanded')            // 具名关键帧 — 预定义的显示状态
folme.to({ scaleX: 0.95 })     // 内联关键帧 — 当场描述的匿名状态
folme.setTo('collapsed')        // 具名关键帧 — 立即到位
folme.setTo({ x: 0, y: 0 })    // 内联属性 — 立即到位
```

在 Patch 编辑器中，`→ to` 节点的目标可以是：
- **具名状态**: Card / 展开 (预定义的显示状态)
- **内联属性**: { scaleX: 0.95 } (在节点上直接定义)
- **动态值**: 来自 Touch/Drag 输出的 x, y (通过连线传入)

三种形式在引擎层面走同一条路：`FolmeManager.to(propObject, config)`。

---

## 画布布局 —— 同时看到所有状态

借鉴 toumo 的好设计，画布上同时展示所有状态（类似 Principle 但更好）：

```
画布
┌─────────────────────────────────────────────────┐
│  主画面                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ 默认状态  │  │ 展开状态  │  │ 加载中   │  ...   │
│  │ (KF 0)  │  │ (KF 1)  │  │ (KF 2)  │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│                                                  │
│  组件 A                                          │
│  ┌─────────┐  ┌─────────┐                       │
│  │ 收起     │  │ 展开     │                       │
│  └─────────┘  └─────────┘                       │
│                                                  │
│  组件 B                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Tab 1   │  │ Tab 2   │  │ Tab 3   │         │
│  └─────────┘  └─────────┘  └─────────┘         │
└─────────────────────────────────────────────────┘
```

- 第一行：主画面的多个显示状态（关键帧），从左到右排列
- 后面每行：每个组件的多个显示状态
- **所有关键帧完整渲染，不用灰色占位**
- 选中某个关键帧可以编辑它的属性覆盖

---

## 不做时间轴

**Intera 面向 UI 交互，不面向影视动画。**

UI 交互的特点：
- 动效由**用户操作触发**，不是按时间线播放
- 关心的是「从状态 A 到状态 B 的过渡感觉」，不是「第 3 秒 opacity 从 0.5 变到 0.8」
- 弹簧动画没有固定时长，不适合时间轴思维

因此：**曲线 + delay 就够了，不需要传统时间轴。**

每个显示状态可以配置：
- **全局曲线** — 默认的过渡曲线 (弹簧参数)
- **元素级覆盖** — 某个元素使用不同曲线
- **属性级覆盖** — 某个属性使用不同曲线 (对应 Folme 的 config.special)
- **delay** — 延迟启动，可以做交错动画

---

## 交互逻辑系统

### 触屏优先

Intera 重点做触屏端交互，触控事件是所有手势的原子基础：

```
down       → 手指按下
startMove  → 首次超过移动阈值 (判定为拖拽，不是点击)
move       → 持续移动 (附带 x, y, speedX, speedY)
up         → 手指抬起 (附带 isClick 判定)
```

所有高级手势都是这些原子事件的组合：
- **点击** = down + up (无 startMove, 时间短)
- **长按** = down + 保持 (时间超过阈值)
- **拖拽** = down + startMove + move... + up

### 拖拽系统 (来自 FolmeDrag)

FolmeDrag 是对 Touch 原子事件的高级封装：
- **begin()** — 开始拖拽（记录起点，跟手）
- **tick()** — 每帧跟手更新位置
- **end()** — 松手
- **scroll()** — 松手后惯性滚动（摩擦力衰减）
- **range()** — 范围约束
- **overScroll()** — 超出范围的橡皮筋效果
- **absorb()** — 吸附点（滚动到附近自动吸附）
- **getPredict()** — 预测惯性终点

在 Patch 编辑器中:
- **Touch 节点** = 原子事件，最大灵活度
- **Drag 节点** = 封装，包含跟手+惯性全套逻辑
- **Scroll 节点** = 更高封装，Drag + range + overscroll + absorb

### 交互逻辑的可视化 (Patch 编辑器)

用 Origami 风格的 Patch 连线来表达交互逻辑。
**每个节点精确映射到 Folme API：**

```
对应代码: mouseAction.onClick = () => {
            isOpen = !isOpen
            card.folme.to(isOpen ? '展开' : '收起')   ← to() = 弹簧动画
         }

Patch 连线:
┌──────────┐     ┌──────────┐ true  ┌──────────────┐
│  Tap     │     │ Toggle   ├──────►│→ 过渡到状态   │  ← → = to() (有动画)
│  按钮A   ├────►│ 变量     │       │ Card / 展开  │
└──────────┘     │ isOpen   │       └──────────────┘
                 │          │ false ┌──────────────┐
                 │          ├──────►│→ 过渡到状态   │
                 └──────────┘       │ Card / 收起  │
                                    └──────────────┘
```

**关键区分**：
- `→ 过渡到状态` = `folme.to('state')` 有弹簧动画（操作显示状态/关键帧）
- `⇒ 跳到状态` = `folme.setTo('state')` 立即到位（操作显示状态/关键帧）
- `→ 动画属性` = `folme.to('x', 100)` 有弹簧动画（直接操作属性，不切换状态）
- `Toggle 变量` / `设置变量` = 改逻辑状态（boolean/number/string 变量）

详见 `docs/UI-DESIGN.md` 的 Patch 编辑器章节。

---

## 四大设计原则

### 1. 渐进复杂度 (Progressive Complexity)

```
Level 0: 自动动效 — 画两个状态，切换时自动弹簧过渡 (80% 场景)
Level 1: 曲线调参 — 调整弹簧参数、delay、per-property override (15% 场景)
Level 2: 逻辑编排 — Patch 连线、变量条件、复杂交互流程 (5% 场景)
```

每一层自洽完整。只用 Level 0 也能交付成品。

### 2. 物理动画默认 (Physics-First)

- 默认弹簧: `response=0.35, damping=0.95` (Folme 默认值)
- Apple 风格参数: response + damping，设计师可直觉调参
- 力可组合: Spring + Friction + Gravity (Folme 独有优势)

### 3. 状态机为骨架 (State Machine as Core)

- 逻辑状态 (变量) 驱动显示状态 (关键帧) 切换
- 不是所有变化都经过逻辑状态 (mouseDown 反馈可以直接 to)
- 共享图层树，关键帧只记录差异

### 4. 预览即产物 (Preview = Production)

- DOM 渲染，CSS 属性就是导出物
- 弹簧参数直接映射到 JS 代码

---

## Folme —— 我们的秘密武器

Intera 的动画引擎移植自 **Folme**——经过多年实战验证的交互动效库。

核心能力：
1. **声明式 API**: `folme.to({ x: 100 })` / `folme.to('stateA')`
2. **Apple 风格弹簧**: `response + damping`
3. **力的可组合**: 一个属性同时受 Spring + Friction + Gravity 驱动
4. **per-property 曲线覆盖**: `config.special` 给不同属性不同曲线
5. **Sugar 预设**: mouseDown/mouseUp/show/hide 自动计算最佳参数
6. **FolmeDrag**: 完整拖拽交互（跟手、惯性、overscroll、吸附）
7. **MouseAction**: 手势判定 + 速度追踪

---

## 不做什么

- ❌ 不做完整的矢量设计工具（不竞争 Figma 的钢笔/布尔/组件库）
- ❌ 不做实时多人协作（后续版本）
- ❌ 不做传统时间轴编辑器（曲线 + delay 足矣）
- ❌ 不做原生移动端导出（先锁定 Web）
- ❌ 不做 Figma 导入（直接在 Intera 里画）

---

## 成功标准

1. **5 分钟**: 新用户 5 分钟内完成第一个交互动效
2. **80%**: 能复现 Dribbble 上 80% 的 UI 动效
3. **60fps**: 预览流畅无卡顿
4. **零翻译**: 导出的代码和预览完全一致

---

## 品味标准

- 这个操作能不能更少一步？
- 这个概念能不能不需要文档就懂？
- 这个默认值是不是已经足够好用？
- 如果 Level 0 能做到，就不要让用户去 Level 1。

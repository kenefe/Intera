# Intera — 分阶段任务计划

> 每个 Phase 包含若干 Task。每个 Task 是一次 AI 会话可以完成的最小单元。
> 用户验收通过后才进入下一个 Task。

---

## Phase 0: 骨架搭建 ✅

> 已完成。项目结构、接口定义、文档、规则。

---

## Phase 1: 动画引擎 (Folme 移植)

> 目标：纯 TS 引擎，零 UI 依赖，可独立测试。
> 参考源码：`reference/folme/`

### Task 1.1: Timeline 全局动画循环
- **文件**: `src/engine/folme/Timeline.ts`
- **职责**: rAF 循环、deltaTime、回调注册/注销、timeScale、自动启停
- **参考**: `Timeline.as`
- **验收**: 注册回调每帧调用，deltaTime 准确，无回调时自动停

### Task 1.2: Force 物理力
- **文件**: `src/engine/folme/forces/Spring.ts`, `Friction.ts`, `Immediate.ts`
- **职责**: 弹簧(response+damping)、摩擦力、立即设值
- **参考**: `force/Spring.as`, `force/Friction.as`, `force/Immediate.as`
- **验收**: Spring(0.95, 0.35) 从 0→100 收敛到目标值

### Task 1.3: IEasing 缓动插值器
- **文件**: `src/engine/folme/IEasing.ts`
- **职责**: 基于缓动函数的时间插值 (linear, quadOut, cubicOut, bezier...)
- **参考**: `IEasing.as`, `Interpolator.as`, `FolmeEase.as`
- **验收**: linear(0.3) 在 300ms 内从 from 线性到 to

### Task 1.4: Ani 单属性动画
- **文件**: `src/engine/folme/Ani.ts`
- **职责**: 管理单属性的力/缓动，每帧推进，判停
- **参考**: `Ani.as`
- **验收**: 创建 Ani + Spring，target=100，next() 后 value 趋近 100

### Task 1.5: AniRequest 动画请求
- **文件**: `src/engine/folme/AniRequest.ts`
- **职责**: 封装一次动画请求 (delay、range、fromValue→toValue、曲线设置)
- **参考**: `AniRequest.as`
- **验收**: 带 delay 的请求延迟执行，range 超出时反弹

### Task 1.6: FolmeManager 元素级管理器
- **文件**: `src/engine/folme/FolmeManager.ts`
- **职责**: to(state/config)、setTo()、cancel()、config.special 属性级覆盖
- **参考**: `FolmeManager.as`
- **关键**: to('stateA') 从元素读取状态对象，config.special 支持 per-property 曲线
- **验收**: `mgr.to({ x:100, y:200 }, { special: { x: spring(1, 0.2) } })` 不同属性不同曲线

### Task 1.7: FolmeEase 曲线工厂
- **文件**: `src/engine/folme/FolmeEase.ts`
- **职责**: spring()、friction()、immediate()、bezier()、linear() 等工厂方法
- **参考**: `FolmeEase.as`
- **验收**: `FolmeEase.spring(0.95, 0.35)` 返回可用 Spring 实例

### Task 1.8: 引擎入口
- **文件**: `src/engine/folme/index.ts`
- **职责**: 统一导出
- **验收**: `import { FolmeManager, FolmeEase } from '@engine/folme'` 可用

---

## Phase 2: 手势引擎 + 拖拽系统

> 目标：完整的手势检测和拖拽交互。
> 参考源码：`reference/MouseAction.as`, `reference/folme/FolmeDrag.as`

### Task 2.1: SpeedTracker 速度追踪
- **文件**: `src/engine/gesture/SpeedTracker.ts`
- **职责**: 采样历史位置，计算瞬时速度（双样本估算）
- **参考**: `MouseAction.as` 的 pushHistory + speed 计算
- **验收**: 匀速输入 → 速度准确，停止输入 → 速度归零

### Task 2.2: GestureEngine 手势识别
- **文件**: `src/engine/gesture/GestureEngine.ts`
- **职责**: 完整手势判定 (click/longClick/drag/hover)，TouchInfo 数据
- **参考**: `MouseAction.as`
- **关键**: click vs drag 的距离+时间阈值判定、longClick 等待、方向判定
- **验收**: 短距离快松手→click，长距离→startMove+move+endMove，停留→longClick

### Task 2.3: DragEngine 拖拽交互
- **文件**: `src/engine/gesture/DragEngine.ts`
- **职责**: begin/tick/end/scroll、range 约束、overScroll 橡皮筋、absorb 吸附
- **参考**: `FolmeDrag.as`
- **关键**: 惯性滚动 (friction)、预测终点 (getPredict)、overscroll 衰减函数
- **验收**: 拖拽→松手→惯性→到边界橡皮筋回弹→吸附到最近 absorb 点

---

## Phase 3: 场景图 + Store

> 目标：图层树数据结构 + Pinia Store

### Task 3.1: SceneGraph 图层操作
- **文件**: `src/engine/scene/SceneGraph.ts`
- **职责**: 增删改查图层、父子关系、重排序
- **验收**: 创建/删除/移动节点，层级关系正确

### Task 3.2: DisplayState 显示状态管理
- **文件**: `src/engine/scene/DisplayState.ts`
- **职责**: 管理显示状态列表、属性覆盖、关键元素/关键属性标记
- **关键**: 共享图层树 + override 差异存储
- **验收**: 添加状态、标记关键属性、读取合并后的完整属性

### Task 3.3: Project Store
- **文件**: `src/store/project.ts`
- **职责**: 持有项目数据，暴露图层+状态操作 actions
- **验收**: addLayer/removeLayer/addDisplayState/switchState 正确

### Task 3.4: Canvas Store
- **文件**: `src/store/canvas.ts`
- **职责**: 画布视口 (zoom, panX, panY, selectedLayerIds, 当前工具)
- **验收**: zoom/pan/selection 变更正确

### Task 3.5: Editor Store
- **文件**: `src/store/editor.ts`
- **职责**: 编辑模式 (设计/预览)、当前工具 (选择/矩形/椭圆/文本)
- **验收**: 切换工具、切换模式

---

## Phase 4: DOM 渲染器 + 画布

> 目标：画布上能看到图层，能缩放平移

### Task 4.1: DOMRenderer 实现
- **文件**: `src/renderer/DOMRenderer.ts`
- **职责**: 实现 Renderer 接口，图层 = div + CSS
- **验收**: createLayer 出 div，updateLayer 改样式

### Task 4.2: 画布视口 (缩放/平移)
- **文件**: `src/components/canvas/CanvasViewport.vue`
- **职责**: wheel 缩放 + 空格拖拽平移
- **验收**: 滚轮缩放，空格+拖拽平移

### Task 4.3: 画板 + 多状态行布局
- **文件**: `src/components/canvas/Artboard.vue`
- **职责**: 第一行主画面多个状态，后续行组件状态
- **关键**: 所有状态完整渲染，不灰色占位
- **验收**: 画布上同时看到多个关键帧状态

### Task 4.4: App 布局
- **文件**: `src/App.vue` 重构
- **职责**: 左面板 + 画布 + 右面板 整体布局
- **验收**: 三栏布局，画布居中

---

## Phase 5: 设计工具基础

> 目标：能在画布上画基本图形

### Task 5.1: 图层选择与拖拽
- **文件**: `src/composables/useLayerInteraction.ts`
- **验收**: 点击选中，拖拽移动

### Task 5.2: 绘制工具 (矩形/椭圆)
- **文件**: `src/composables/useDrawTool.ts`
- **验收**: R/O 快捷键，拖拽绘制

### Task 5.3: 文本工具
- **文件**: `src/composables/useTextTool.ts`
- **验收**: T 键，点击创建文本，contenteditable 编辑

### Task 5.4: 属性面板
- **文件**: `src/components/panels/PropertiesPanel.vue`
- **验收**: 选中图层显示属性，修改实时更新

### Task 5.5: 图层面板
- **文件**: `src/components/panels/LayerPanel.vue`
- **验收**: 图层树展示，点击选中，拖拽重排

---

## Phase 6: 显示状态 + 动画

> 目标：多关键帧 + 状态切换 + 弹簧动画

### Task 6.1: 显示状态 UI (状态栏)
- **文件**: `src/components/canvas/StateBar.vue`
- **职责**: 状态缩略图，添加/删除/切换状态
- **验收**: 点击切换状态，画布跳转

### Task 6.2: 关键元素/关键属性标记
- **文件**: `src/components/panels/KeyPropertyPanel.vue`
- **职责**: 标记哪些元素和属性参与状态切换
- **验收**: 勾选后，该属性在不同状态可以不同

### Task 6.3: SmartAnimate 状态过渡
- **文件**: `src/engine/scene/SmartAnimate.ts`
- **职责**: 对比两个状态，生成 Folme.to() 调用
- **验收**: 从状态 A 切到 B，关键属性弹簧过渡

### Task 6.4: 曲线配置面板 (三级覆盖)
- **文件**: `src/components/panels/CurvePanel.vue`
- **职责**: 全局曲线 → 元素级覆盖 → 属性级覆盖
- **关键**: 弹簧调参器 (response/damping 滑块 + 实时预览)
- **验收**: 修改全局曲线影响所有，元素/属性覆盖局部生效

### Task 6.5: delay 编排
- **文件**: 整合到 CurvePanel
- **职责**: per-element delay，实现交错动画 (stagger)
- **验收**: 3 个元素不同 delay，切换状态时依次动画

---

## Phase 7: 交互逻辑 (Patch 编辑器)

> 目标：可视化定义交互触发和逻辑

### Task 7.1: 变量系统 (逻辑状态)
- **文件**: `src/engine/state/VariableManager.ts`
- **职责**: boolean/number/string 变量，get/set/onChange
- **验收**: 设置变量、监听变化

### Task 7.2: Patch 运行时
- **文件**: `src/engine/state/PatchRuntime.ts`
- **职责**: 触发器→动作执行链路
- **验收**: Tap 触发 → 条件判断 → 切换显示状态

### Task 7.3: Patch 节点 UI
- **文件**: `src/components/patch/PatchNode.vue`
- **验收**: 节点渲染，端口显示

### Task 7.4: Patch 连线交互
- **文件**: `src/components/patch/PatchCanvas.vue`
- **验收**: 拖拽连线，删除连线

### Task 7.5: 触发器 (Tap/Hover/Drag)
- **文件**: `src/engine/state/triggers/`
- **验收**: 预览模式下 Tap 触发交互

### Task 7.6: Sugar 预设模板
- **文件**: `src/engine/state/SugarPresets.ts`
- **职责**: 一键生成常见交互 (按钮反馈、卡片展开、Tab 切换、Hover 高亮)
- **参考**: `Sugar.as` + toumo 的 SugarPresets
- **验收**: 右键元素 → 选择预设 → 自动生成 Patch + 状态

---

## Phase 8: 预览模式

> 目标：可交互的实时预览

### Task 8.1: 预览模式切换
- **文件**: `src/components/canvas/PreviewMode.vue`
- **职责**: 从编辑模式切到预览模式，手势可交互
- **验收**: 点击预览按钮，画布变为可交互

### Task 8.2: 手势绑定
- **文件**: `src/composables/usePreviewGesture.ts`
- **职责**: 预览模式下 GestureEngine 驱动 Patch 触发
- **验收**: 预览模式点击按钮 → 触发状态切换 → 弹簧动画

---

## Phase 9: 导出

### Task 9.1: CSS/JS 代码导出
### Task 9.2: Lottie JSON 导出
### Task 9.3: 视频导出 (WebCodecs + DOM 光栅化)

---

## Phase 10: 打磨

### Task 10.1: 快捷键系统
### Task 10.2: 撤销/重做 (Undo/Redo)
### Task 10.3: 项目保存/加载 (OPFS + File System Access API)
### Task 10.4: 性能优化

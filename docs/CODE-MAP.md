# Intera — 代码地图

> 改代码前先查这张表，定位模块 → 读源码 → 动手。

---

## Engine 层 (`src/engine/`) — 纯 TypeScript，零 UI 依赖

| 模块 | 核心文件 | 职责 |
|---|---|---|
| **Folme** | `folme/Timeline.ts` | 全局 rAF 循环，deltaTime，自动启停 |
| | `folme/forces/Spring.ts` | 阻尼弹簧 (Apple 风格 response+damping) |
| | `folme/forces/Friction.ts` | 摩擦力衰减 |
| | `folme/forces/Immediate.ts` | 立即冻结 |
| | `folme/Ani.ts` | 单属性动画实例 (双模驱动: Force/Easing) |
| | `folme/AniRequest.ts` | 动画请求生命周期 + 边界处理 |
| | `folme/FolmeManager.ts` | 元素级动画管理 (to/setTo/cancel) |
| | `folme/index.ts` | barrel export (FolmeManager + SpringEngine) |
| | `folme/Easing.ts` | 缓动插值器 + 贝塞尔 |
| | `folme/FolmeEase.ts` | 曲线工厂 |
| **手势** | `gesture/SpeedTracker.ts` | 速度追踪 (惯性用) |
| | `gesture/GestureEngine.ts` | 原始触控事件处理 |
| | `gesture/DragEngine.ts` | 拖拽 + 橡皮筋 + 惯性 + 吸附 |
| **场景** | `scene/types.ts` | 类型 barrel (re-export SceneTypes + PatchTypes) |
| | `scene/SceneTypes.ts` | 图层/状态/曲线类型定义 |
| | `scene/PatchTypes.ts` | Patch 节点 discriminated union 类型 |
| | `scene/SceneGraph.ts` | 图层树 CRUD |
| | `scene/DisplayState.ts` | 显示状态 + override 管理 |
| | `scene/ComponentResolver.ts` | instance 递归解析 + 循环检测 |
| | `scene/SmartAnimate.ts` | 状态差异 → folme.to() 调用 |
| **交互** | `state/VariableManager.ts` | 逻辑变量 get/set/toggle |
| | `state/PatchRuntime.ts` | Patch 图执行引擎 (Map 索引 + 定时器管理) |
| | `state/PatchDefs.ts` | Patch 节点端口定义 + 工厂 |
| | `state/clonePatches.ts` | instance Patch 子图克隆 + layerId 重映射 |
| | `state/BehaviorManager.ts` | Behavior 节点生命周期 (create/destroy) |
| | `state/SugarPresets.ts` | 一键预设 |
| **基础** | `idFactory.ts` | 统一 ID 生成工厂 |
| **导出** | `export/CSSExporter.ts` | 独立 HTML 导出 (内嵌弹簧引擎) |
| | `export/LottieExporter.ts` | Lottie JSON |
| | `export/VideoExporter.ts` | WebM 视频 (Canvas2D + MediaRecorder) |
| | `export/SpringSim.ts` | 导出用弹簧模拟器 (独立于 folme，嵌入导出产物) |
| | `export/resolve.ts` | 状态属性解析 (导出时合并 override) |
| **其他** | `UndoManager.ts` | 通用撤销/重做栈 |
| | `ProjectStorage.ts` | localStorage + 文件 IO |

---

## UI 层 (`src/components/`)

| 目录 | 文件 | 职责 |
|---|---|---|
| `canvas/` | `CanvasViewport.vue` | 画布容器 (缩放/平移/事件分发) |
| | `ArtboardGrid.vue` | 多状态网格布局 |
| | `Artboard.vue` | 单个画板渲染 |
| | `StateBar.vue` | 状态栏 (切换/新增状态) |
| | `SelectionOverlay.vue` | 选中图层的边框/手柄/多选框 |
| `panels/` | `PreviewPanel.vue` | 实时交互预览面板 (左栏常驻) |
| | `LayerPanel.vue` | 图层树面板 |
| | `LayerIcon.vue` | 图层类型图标 (矩形/椭圆/Frame/文本) |
| | `PropertiesPanel.vue` | 属性检查器 (位置/尺寸/变换 + 子组件委托) |
| | `PropTextGroup.vue` | 文本属性子组件 (字号/字体/字重/对齐) |
| | `PropLayoutGroup.vue` | 布局属性子组件 (方向/间距，仅容器) |
| | `PropAppearanceGroup.vue` | 外观属性子组件 (透明度/填充/描边/圆角) |
| | `ColorPicker.vue` | 自定义颜色选择器 (hex 输入 + 30 色色板) |
| | `CollapsibleGroup.vue` | 可折叠分组容器 (▾ 箭头 + 点击折叠) |
| | `prop-shared.css` | 属性面板共享样式 (.prop-row/.prop-field/.input 等) |
| | `KeyPropertyPanel.vue` | 关键属性标记 |
| | `CurvePanel.vue` | 曲线编辑 (三级覆盖) |
| | `CurveEdit.vue` | 曲线可视化编辑 (slider + 精确数值输入) |
| `patch/` | `PatchCanvas.vue` | Patch 编辑器画布 |
| | `PatchNode.vue` | 单个 Patch 节点 (端口+内联配置) |
| | `patch-config.css` | 配置区共享样式 |
| | `PatchVarPanel.vue` | 变量管理面板 (增删改名/类型/默认值，可折叠) |
| 根级 | `ContextMenu.vue` | 右键菜单 |
| | `ExportDialog.vue` | 导出对话框 |
| | `App.vue` | 根组件 (四栏布局 + Patch 行) |
| | `main.ts` | 应用入口 (createApp + Pinia) |

---

## Store 层 (`src/store/`)

| 文件 | 职责 |
|---|---|
| `project.ts` | 项目数据中枢 (图层/状态/动画/撤销/持久化) |
| `editor.ts` | 工具选择 + Patch 面板开关 |
| `canvas.ts` | 视口 (zoom/pan) + 选区 |
| `patch.ts` | Patch 编辑器状态 (变量 + Patch CRUD + 运行时 + instance patch 克隆) |

---

## Composables (`src/composables/`)

| 文件 | 职责 |
|---|---|
| `useTransition.ts` | 动画过渡 |
| `useComponentActions.ts` | 组件 CRUD (createComponent/createInstance/updateOverride/detach) |

---

## 其他

| 文件 | 职责 |
|---|---|
| `renderer/DOMRenderer.ts` | DOM 渲染器 (实现 Renderer 接口) |
| `renderer/types.ts` | Renderer 抽象接口 |
| `composables/usePanelResize.ts` | 面板拖拽调高度 + localStorage 持久化 |
| `composables/useLayerInteraction.ts` | 图层选择 + 拖拽移动 |
| `composables/useLayerDrag.ts` | 图层拖拽细节 (偏移计算) |
| `composables/useDrawTool.ts` | 绘制工具 (矩形/椭圆/Frame) |
| `composables/useTextTool.ts` | 文本工具 (点击创建 + contenteditable) |
| `composables/usePreviewGesture.ts` | 预览模式手势绑定 (Patch 触发 + Behavior 驱动) |
| `composables/useKeyboard.ts` | 全局快捷键 (工具/撤销/保存/打开/方向键微调) |
| `composables/useTransition.ts` | 状态切换过渡辅助 |
| `utils/propHelpers.ts` | 属性面板共享工具函数 (num/px/dpx/str) |
| `reference/` | AS3 源码参考 (只读，不要修改) |

---

## AS3 源码映射

当需要对照原始实现时:

| TypeScript | AS3 参考 |
|---|---|
| `folme/Timeline.ts` | `reference/folme/Timeline.as` |
| `folme/forces/Spring.ts` | `reference/folme/force/Spring.as` |
| `folme/FolmeManager.ts` | `reference/folme/FolmeManager.as` |
| `folme/Ani.ts` | `reference/folme/Ani.as` |
| `folme/AniRequest.ts` | `reference/folme/AniRequest.as` |
| `gesture/DragEngine.ts` | `reference/folme/FolmeDrag.as` |
| `gesture/SpeedTracker.ts` | `reference/folme/SpeedTracker.as` |
| `gesture/GestureEngine.ts` | `reference/MouseAction.as` |

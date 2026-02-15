# 已知问题 (Known Issues)

> AI 修完 bug 后，从「待修」移到「已修」并注明日期和修法。
> 新发现的问题直接追加到对应分类。

---

## 待修 (Open)

### P1 — 类型安全

- [ ] **PatchRuntime config 类型断言泛滥**
  - 文件: `src/engine/state/PatchRuntime.ts`
  - 现象: `cfg.variableId as string` 等 `as` 断言，绕过类型检查
  - 建议: 为每种 PatchType 定义专用 config 接口 (联合类型 + 类型守卫)

### P2 — 代码规范

_(P1 UI 布局 + P2 代码规范问题已全部修复，见「已修」区)_

---

## 待验证 (Needs Verification)

> 以下功能已实现但未经人工 UX 验证。

_全部已通过自动化 + 手动混合验证 (2026-02-14)。详见 BDD 测试 70/70 通过 (Feature 49 + Persona 21)。_

---

## 摩擦日志 (Friction Log)

> 角色旅程验证 (Flow E) 过程中发现的体验摩擦点。
> 格式: `[角色/旅程] 摩擦描述 → 修复方案 → 状态`
> 状态: 🔴 待修 / 🟡 修复中 / 🟢 已修

### 两层验证状态

| 层 | 用途 | 状态 |
|---|---|---|
| **能力回归** (`persona.spec.ts`) | 确认功能没坏 (自动跑) | 6/6 ✅ |
| **Feature BDD** (`intera.spec.ts`) | 功能原子级验证 (自动跑) | 49/49 ✅ |
| **旅程探索** (Flow E) | AI 逐步操作验证体验 | 6/6 ✅ (第二轮 6/6 ✅) |

### 画像列表 (能力图谱自动枚举)

| 画像 | 能力集 | 旅程探索 |
|---|---|---|
| 基础绘制 | ∅ | ✅ |
| 状态系统 | states | ✅ |
| 状态 · 曲线 | states, curves | ✅ |
| 状态 · 节点 | states, patch | ✅ |
| 状态 · 曲线 · 节点 | states, curves, patch | ✅ |
| 全能力 | states, curves, patch, folme | ✅ |

> ⬜ 待探索 / ✅ 通过 / 🔄 迭代中
> 旅程探索 = AI 自己打开浏览器逐步操作 (Flow E)，不是自动化测试
> 第二轮 (2026-02-14): 6/6 ✅ 零新增摩擦，不同设计任务覆盖更多场景

### 摩擦记录

| 日期 | 画像 | 摩擦描述 | 修复 | 状态 |
|---|---|---|---|---|
| 2026-02-14 | 状态系统 | 默认状态 (displayStates[0]) 显示了 × 删除按钮，用户可误删基准状态 | StateBar `idx > 0` 条件 + DisplayState 引擎层拒绝删除默认状态 | 🟢 |
| 2026-02-14 | 节点编辑系 | Patch 截图捕获了关闭后的画面，丢失 Patch 编辑器视觉记录 | `patch` action 保持 Patch 打开 + 验证 `.patch-canvas` 可见 | 🟢 |
| 2026-02-14 | 全能力 Folme | Folme 验证形同虚设 — 仅检查 `.panel-right` 可见性 | 改为验证弹簧类型选择器 + 响应/阻尼滑块 + 数值显示 + 滚动到曲线面板 | 🟢 |
| 2026-02-14 | 弹簧曲线系 | 曲线面板在右侧面板底部被截断，截图无法完整呈现弹簧参数 | `curves` action 添加 `scrollIntoViewIfNeeded()` 确保曲线面板可见 | 🟢 |
| 2026-02-14 | 基础绘制 ×3 | 属性面板 input 聚焦后 R/O/V 快捷键被吞掉，工具无法切换 (P0) | `useKeyboard` 区分文本/数值 input，数值 input 中单字母快捷键仍生效 | 🟢 |
| 2026-02-14 | 基础绘制 ×2 | 新图层默认白色 (#FFFFFF)，白色卡片上白色图层不可见 (P1) | `defaultProps.fill` 改为 `#D9D9D9` (Figma 风格浅灰) | 🟢 |
| 2026-02-14 | 综合集成 | 绘制模式下 SelectionOverlay 手柄拦截指针事件，导致连续绘制丢失图层 (P1) | `.draw-mode` CSS 类禁用手柄 `pointer-events` | 🟢 |
| 2026-02-14 | 状态·节点 | Patch 变量选择器下拉为空，无创建变量入口，用户完全卡住 (P0) | PatchNode 变量选择器旁添加 "+" 按钮，就地创建布尔变量并自动绑定 | 🟢 |
| 2026-02-14 | 基础绘制 R3 | 画板外点击绘制时坐标映射到 canvas-world 而非画板本地，导致 X/Y 偏移 (P1) | `resolveFrame()` 三级查找 + border 补偿; 画板内绘制 X=63/105/146 验证通过 | 🟢 |
| 2026-02-14 | 基础绘制 R3 | 文本图层 W 属性不可编辑 — 输入宽度值不生效，文本宽度由内容自适应 (P2) | 待确认: 是否为设计意图 | 🔴 |
| 2026-02-15 | 状态系统 R3 | number input 点击易误触 spinner 箭头，Ctrl+A 在 input 聚焦时选中画布图层而非 input 内容 (P2) | — | 🔴 |
| 2026-02-15 | states+curves R2 | 状态栏激活状态视觉反馈不清晰，用户误以为在状态3操作实际激活的是状态2 (P2) | — | 🔴 |
| 2026-02-15 | states+curves R2 | 曲线面板需要大量滚动才能看到，curves 画像核心功能藏在底部 (P3) | — | 🔴 |
| 2026-02-15 | states+curves R2 | 曲线面板元素缺少语义属性，自动化工具无法检测 slider/数值 (P3) | — | 🔴 |
| 2026-02-15 | states+curves R2 | Range slider 无法直接输入精确数值，只能拖拽 (P3) | — | 🔴 |
| 2026-02-15 | states+patch R3→R4 | Patch 端口拖线失败 — 根因是 journey-server drag 缺少 80ms 延时，非产品 bug | journey-server.mjs drag 添加 80ms waitForTimeout | 🟢 |
| 2026-02-15 | drag-card | Drag 行为不工作 — BehaviorManager 创建 DragEngine 但未绑定 DOM 指针事件，usePreviewGesture 无 Drag 感知 (P0) | BehaviorManager 暴露 engine+layerId + findByLayer(); usePreviewGesture 检测 behaviorDrag 并喂 begin/tick/end; PreviewPanel 添加 pointer capture; PatchRuntime.rebuild() 重建行为实例; patch store 变更后调用 rebuild() | 🟢 |

### 待优化 (旅途探索发现 · 非阻塞)

| 严重度 | 描述 | 发现画像 | 备注 |
|---|---|---|---|
| P1 | **方向键移动图层未实现**: 设计工具标配。↑↓←→ 移 1px, Shift+箭头 移 10px | arrow-drag | `useKeyboard.ts` 添加 Arrow 处理 |
| P1 | 画完自动切回 Select，用户不知要再按 R 才能继续画下一个 | 用户 B | 标准 Figma 行为但新手困惑 |
| P1 | 工具切换失败时零视觉反馈 (按键被 input 吞掉但无提示) | 用户 C | P0 修复后大幅缓解，仅文本 input 内残留 |
| P2 | **画板外图层难以拖回**: 图层拖出可视区域后无法再命中。需右键"回到中心"或图层面板双击定位 | arrow-drag | |
| P2 | **Patch 画布高度不足**: 超过 4 个节点时底部被裁剪 (固定 250px) | toggle-card | 需要可滚动或自适应高度 |
| P2 | **无 Ctrl+O 打开快捷键**: 文件打开仅通过工具栏按钮 | file-open-save | 添加 Meta+o 绑定 |
| ~~P2~~ | ~~**变量无独立管理面板**~~ → 已修 2026-02-14，见「已修」区 | toggle-card | |
| P2 | 原生 HTML 颜色选择器 (`<input type="color">`)，无 hex 输入、无色板 | ×3 | |
| P2 | 画板默认缩放太小，精确绘制困难 | ×2 | |
| P2 | 图层无法重命名 (只有 "矩形 1/2/3") | ×2 | |
| P2 | 画布点击选层不稳定 — 重叠形状间点击经常选不中目标 | 用户 C | |
| P2 | 工具激活状态指示不够明显 | 用户 B | |
| P2 | 描边默认 1px 太细 | 用户 A | |
| P3 | 无对齐参考线/智能吸附 | 用户 B + arrow-drag | |
| P3 | 透明度差异在小预览面板中几乎不可辨 | 用户 B | |
| P2 | **number input 编辑体验差**: 点击 number input 易误触 spinner 箭头导致微调而非聚焦编辑；Ctrl+A 在 input 聚焦时选中画布图层而非 input 内容 | 状态系统 R3 | PropertiesPanel number input 需要更大的文字点击区域或隐藏 spinner |
| P2 | **状态栏激活状态视觉反馈不清晰**: 切换状态时当前激活状态高亮不够明显，用户可能误以为在状态3操作实际激活的是状态2，导致覆盖值写入错误状态 | states+curves R2 | StateBar 需要更强的激活态视觉区分（加粗/底色/下划线） |
| P3 | **曲线面板需要大量滚动才能看到**: CurvePanel 和 KeyPropertyPanel 位于 PropertiesPanel 下方，右侧面板需要滚动很多才能到达。对 curves 画像用户来说曲线是核心功能 | states+curves R2 | 考虑折叠/展开机制或将曲线面板提升到更显眼位置 |
| P3 | **曲线面板元素对自动化工具不可见**: slider、数值显示等交互元素缺少 title/data-testid 等语义属性，journey-server 元素扫描无法检测 | states+curves R2 | 为曲线面板交互元素添加 data-testid 或 title 属性 |
| P3 | **Range slider 精确控制困难**: 弹簧参数（response/damping）仅有 range slider，无法直接输入精确数值 | states+curves R2 | 在 slider 旁添加可编辑数值输入框 |
| ~~P0~~ | ~~**Patch 端口拖线失败**~~ → 已修 2026-02-15: 根因是 journey-server drag 操作缺少 move→down→move→up 之间的延时，非产品代码 bug。添加 80ms 延时后拖线正常 | states+patch R3→R4 | 🟢 已修 (journey-server 时序) |
| P3 | 无撤销操作视觉反馈 | 用户 A | |

---

## 已修 (Resolved)

| 日期 | 问题 | 修法 |
|---|---|---|
| 2026-02-14 | **默认状态可被删除** (P1) | StateBar 用 `idx > 0` 隐藏默认状态删除按钮; DisplayState 引擎层对 `displayStates[0]` 拒绝删除 |
| 2026-02-14 | **`setTo` patch 与 `to` 行为相同** (P0) | `PatchRuntime` 增加 `onSetTo` 回调，`project.ts` 新增 `setToState()` 即时跳转，无弹簧动画 |
| 2026-02-14 | **椭圆渲染为矩形** (P0) | `DOMRenderer` 区分 LayerType，椭圆设置 `border-radius: 50%` |
| 2026-02-14 | **属性面板缺少 5 个 AnimatableProps 控件** | 补全 rotation, scaleX, scaleY, stroke, strokeWidth 编辑控件 |
| 2026-02-14 | **`transitionToState` groupId 可能为空** | 添加 stateId 反查 groupId 的兜底逻辑 |
| 2026-02-14 | **Patch 节点缺少配置 UI** | `PatchNode.vue` 添加内联选择器配置 layerId, stateId, groupId 等 |
| 2026-02-14 | **多选图层无视觉反馈** | `SelectionOverlay.vue` 为所有选中图层渲染独立蓝色边框 |
| 2026-02-14 | **滚轮事件未区分缩放与平移** | `CanvasViewport.vue` 用 ctrlKey 区分 pinch-zoom 和 trackpad-pan |
| 2026-02-14 | **BDD 测试端口硬编码** | 改为 `process.env.TEST_URL ?? 'http://localhost:5174'` |
| 2026-02-14 | **BDD 预览模式测试假设不存在的 UI** | 重写为预览面板常驻左栏的测试 |
| 2026-02-14 | **Patch 节点配置区域与节点背景融合** (P1) | `.node-config` 增加深色背景、`.cfg-select`/`.cfg-label` 提升对比度和尺寸 |
| 2026-02-14 | **Patch 端口命中区域太小 (8px)** (P1) | 端口 8→10px + 24px 伪元素命中区 + hover 发光 + 输出端口蓝紫色区分 |
| 2026-02-14 | **属性面板输入框与背景融合** (P2) | `.prop-field` 增加 border + hover/focus 态 + `.color-input` 增加边框 |
| 2026-02-14 | **Patch 编辑器无法删除节点** (P0) | 节点选中态 + Delete 键 + × 按钮 + 批量删除 |
| 2026-02-14 | **Patch 节点无选中态** (P0) | `selected` Set + 蓝紫色高亮边框 + Shift 多选 + Cmd+A 全选 + Esc 取消 |
| 2026-02-14 | **重复连线无防护** (P0) | store 层 `addConnection` 添加 `some()` 去重检查 |
| 2026-02-14 | **Patch 连线坐标与端口偏移** (P1) | `portPos()` 改为 DOM 实测 + 常量回退 |
| 2026-02-14 | **Patch 连线可选中+删除** (P1) | 连线点击选中 (蓝色加粗) + Delete 键删除 |
| 2026-02-14 | **属性面板无覆盖标记** (P1) | 非默认状态下覆盖属性显示橙色边框 + ↺ 重置按钮 + 状态 badge |
| 2026-02-14 | **描边默认值 'none' 误导** (P2) | 描边改为 checkbox 开关 + 颜色选择器联动，关闭时隐藏选择器 |
| 2026-02-14 | **属性面板缺少图层信息** (P2) | 添加 `.layer-header` 显示图层类型标签 + 名称 + 覆盖状态 badge |
| 2026-02-14 | **画板底部被截断** (P1) | `canvas.ts` 新增 `fitToViewport` 自适应缩放+居中; `CanvasViewport` mount 后自动调用; 绘制/拖拽坐标 `Math.round` 像素对齐 |
| 2026-02-14 | **`project.ts` 超 200 行 (~318 行)** (P2) | 动画过渡拆分至 `composables/useTransition.ts` (96 行); project.ts 降至 199 行 |
| 2026-02-14 | **App.vue CSS 按钮样式重复** (P2) | `.btn-action` 和 `.btn-patch` 合并为共享选择器 |
| 2026-02-14 | **DOMRenderer.captureFrame() 空壳** (P2) | Renderer 接口标为 `captureFrame?()` (optional); DOMRenderer 移除空壳实现 |
| 2026-02-14 | **变量无独立管理面板** (P2) | `PatchVarPanel.vue` — Patch 画布右侧可折叠变量面板，支持增删改名/类型/默认值; `patch.ts` 新增 `updateVariable()`; `App.vue` 添加 `.patch-row` 布局 |
| 2026-02-13 | `CanvasViewport.vue:84` 编译错误 — `up(e)` 传了多余参数 | 改为 `up()` |
| 2026-02-15 | **Drag 行为不工作** (P0) — BehaviorManager 创建 DragEngine 但未绑定 DOM 指针事件 | BehaviorManager 暴露 engine+layerId + findByLayer(); usePreviewGesture 检测 behaviorDrag 喂 begin/tick/end + scale 补偿; PreviewPanel pointer capture; PatchRuntime.rebuild() 重建行为; patch store 变更后 rebuild() |

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

### 画像旅程验证 (动态画像·零预置)

| 画像 | 活跃能力 | 旅程步数 | 状态 |
|---|---|---|---|
| 基础绘制 | ∅ | 2 | ✅ |
| 状态系统 | states | 6 | ✅ |
| 状态系统 · 弹簧曲线 | states, curves | 7 | ✅ |
| 状态系统 · 节点编辑 | states, patch | 7 | ✅ |
| 状态系统 · 弹簧曲线 · 节点编辑 | states, curves, patch | 8 | ✅ |
| 全能力 (含 Folme) | states, curves, patch, folme | 9 | ✅ |

> ⬜ 未验证 / ✅ 通过 / 🔄 迭代中
> 画像从 CAPS 能力图谱自动枚举，加能力 → 新画像涌现

**Feature BDD**: 49/49 (100%) · **Persona BDD**: 6/6 (100%)

### 摩擦记录

| 日期 | 画像 | 摩擦描述 | 修复 | 状态 |
|---|---|---|---|---|
| 2026-02-14 | 节点编辑系 | Patch 截图捕获了关闭后的画面，丢失 Patch 编辑器视觉记录 | `patch` action 保持 Patch 打开 + 验证 `.patch-canvas` 可见 | 🟢 |
| 2026-02-14 | 全能力 Folme | Folme 验证形同虚设 — 仅检查 `.panel-right` 可见性 | 改为验证弹簧类型选择器 + 响应/阻尼滑块 + 数值显示 + 滚动到曲线面板 | 🟢 |
| 2026-02-14 | 弹簧曲线系 | 曲线面板在右侧面板底部被截断，截图无法完整呈现弹簧参数 | `curves` action 添加 `scrollIntoViewIfNeeded()` 确保曲线面板可见 | 🟢 |

---

## 已修 (Resolved)

| 日期 | 问题 | 修法 |
|---|---|---|
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
| 2026-02-13 | `CanvasViewport.vue:84` 编译错误 — `up(e)` 传了多余参数 | 改为 `up()` |

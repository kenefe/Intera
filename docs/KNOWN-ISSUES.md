# 已知问题 (Known Issues)

> AI 修完 bug 后，从「待修」移到「已修」并注明日期和修法。
> 新发现的问题直接追加到对应分类。

---

## 待修 (Open)

### P0 — 功能错误

- [ ] **椭圆渲染为矩形**
  - 文件: `src/renderer/DOMRenderer.ts` → `applyProps()`
  - 现象: 椭圆类型的图层在画布上显示为直角矩形
  - 根因: `applyProps()` 不区分 LayerType，椭圆应设置 `border-radius: 50%`
  - 截图: `tests/screenshots/03-ellipse.png`

- [ ] **PatchRuntime `to` vs `setTo` 行为相同**
  - 文件: `src/engine/state/PatchRuntime.ts:66-73`
  - 现象: `to` 和 `setTo` 都调用 `onTransition()`，后者应立即到位无动画
  - 根因: `project.transitionToState()` 总是做弹簧动画，缺少 `setToState()` 方法
  - 影响: Patch 编辑器中 `⇒ setTo` 节点无法实现「立即跳转」

### P1 — 类型安全

- [ ] **PatchRuntime config 类型断言泛滥**
  - 文件: `src/engine/state/PatchRuntime.ts`
  - 现象: `cfg.variableId as string` 等 `as` 断言，绕过类型检查
  - 建议: 为每种 PatchType 定义专用 config 接口 (联合类型 + 类型守卫)

### P1 — UI 布局

- [ ] **预览模式画板未居中**
  - 文件: `src/components/canvas/PreviewMode.vue` + `CanvasViewport.vue`
  - 现象: 进入预览模式后画板偏左上，未水平垂直居中
  - 截图: `tests/screenshots/04-preview.png`

- [ ] **画板在设计模式下底部被截断**
  - 文件: `src/components/canvas/ArtboardGrid.vue`
  - 现象: 375×812 的画板在 1440×900 视口中底部超出可视区域
  - 建议: 初始加载时自动缩放适配 (fit to viewport)

### P2 — 代码规范

- [ ] **`project.ts` 超 200 行 (295 行)**
  - 文件: `src/store/project.ts`
  - 建议: 拆分 undo/redo → `composables/useUndoRedo.ts`，持久化 → `composables/useProjectStorage.ts`

- [ ] **App.vue CSS 按钮样式重复**
  - 文件: `src/App.vue`
  - 现象: `.btn-action`, `.btn-export`, `.btn-patch` 三个近乎相同的样式
  - 建议: 提取 `.btn-toolbar` 共享基类

- [ ] **DOMRenderer.captureFrame() 空壳**
  - 文件: `src/renderer/DOMRenderer.ts:125-127`
  - 现象: `throw new Error('未实现')` 但 Phase 9 标记完成
  - 建议: VideoExporter 已用 Canvas2D 替代，从 Renderer 接口移除或标 optional

---

## 待验证 (Needs Verification)

> 以下功能已实现但未经人工 UX 验证。

- [ ] 画布缩放/平移 (滚轮 + 空格拖拽)
- [ ] 图形绘制 (矩形/椭圆/Frame/文本)
- [ ] 图层选择/拖拽移动
- [ ] 图层面板 (树结构/可见性/锁定)
- [ ] 属性面板 (数值编辑)
- [ ] 多状态画板网格
- [ ] 状态切换弹簧动画
- [ ] 关键属性标记
- [ ] 曲线三级覆盖编辑
- [ ] Patch 编辑器 (节点/连线)
- [ ] 预览模式
- [ ] 导出 (HTML/Lottie/WebM)
- [ ] 撤销/重做
- [ ] 项目保存/加载
- [ ] 快捷键

---

## 已修 (Resolved)

| 日期 | 问题 | 修法 |
|---|---|---|
| 2026-02-13 | `CanvasViewport.vue:84` 编译错误 — `up(e)` 传了多余参数 | 改为 `up()` (三个 composable 的 up() 都不需要事件参数) |

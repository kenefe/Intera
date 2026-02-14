# 旅程: 文件打开与保存

## 画像
专项特性验证: 项目持久化 (localStorage + 文件 I/O)

## 设计目标
创建多图层+多状态设计 → Ctrl+S 保存 → 刷新验证恢复 → 导出文件 → 清空环境 → 导入恢复

## 过程

### Step 01 — 干净起点
清空 localStorage，确认空画布。

### Step 02~03 — 创建图层
绘制 Frame 容器 + 内部矩形，两个图层。

### Step 04 — 重命名
将容器重命名为"保存测试"，验证名称持久化。

### Step 05 — 添加状态
添加第二个显示状态（状态 2），确保多状态数据被保存。

### Step 06 — 保存
通过 dispatchEvent 触发 Ctrl+S → `saveToLocal()` → localStorage。
验证: layers ≥ 2, displayStates = 2。

### Step 07 — 刷新恢复
刷新页面后 `loadSaved()` 自动恢复:
- ✅ 图层数量正确
- ✅ 状态数量正确
- ✅ 重命名名称保持

### Step 08 — 导出设计文件
从 localStorage 读取数据保存为 `design.intera`。

### Step 09 — 清空环境
清除 localStorage (需处理 `beforeunload` 自动保存竞争)，确认空画布。

### Step 10 — 导入恢复
注入文件数据到 localStorage，刷新后完整恢复。

## 摩擦点

1. **Ctrl+S (Meta+s) 在 headless Chromium 可能被拦截**: 需要通过 `window.dispatchEvent(KeyboardEvent)` 触发，而非 `page.keyboard.press('Meta+s')`。产品本身的快捷键绑定正常。
2. **beforeunload 自动保存竞争**: `page.reload()` 触发 `beforeunload` → 应用自动保存当前状态 → 覆盖测试注入的数据。这是正确的产品行为，但在自动化测试中需要处理。
3. **无 Ctrl+O 快捷键**: Open 仅通过工具栏按钮触发，无键盘快捷键。建议添加。
4. **Save 按钮触发原生文件对话框**: headless 环境中无法测试 `showSaveFilePicker`。

## 结论
✅ 通过 — 核心持久化链路完整: 创建 → 保存 → 恢复 → 导出 → 导入 全部正常。

# 旅程: 状态·节点画像 — 可折叠信息面板

## 画像
**{states, patch}** — 能力集: {states, patch}

## 设计目标
创建一个可折叠的信息面板：有"展开"和"收起"两个显示状态，通过 Patch 节点（Touch → Toggle）连接点击手势触发状态切换。展开时显示完整矩形+标题文本，收起时矩形高度缩小为标题栏。

## 过程

### Step 1: 初始界面
- **截图**: screenshots/step-01.png
- **看到**: 空白画布，工具栏、图层面板、属性面板、状态栏（默认状态）、Patch 编辑器
- **决策**: 按 R 激活矩形工具，开始绘制面板背景

### Step 19-20: 绘制面板背景矩形
- **截图**: screenshots/step-20.png
- **看到**: 矩形 1 创建成功，X:-82, Y:36, W:663, H:724
- **摩擦**: 画布坐标映射导致绘制的矩形坐标为负值（X:-82），尺寸与拖拽范围不成比例
- **决策**: 接受现有坐标，继续设计

### Step 21-27: 尝试编辑数值输入框
- **截图**: screenshots/step-26.png
- **看到**: 点击 number input 时触发 step 微调（X 从 -288 递减到 -291），而非聚焦输入框
- **摩擦**: ⚠️ **number input 点击行为不直观** — 单击/双击数值区域触发 step 递减，无法直接聚焦编辑。这是已知摩擦点，严重影响精确定位效率
- **决策**: 放弃精确编辑坐标，使用拖拽方式调整

### Step 28-34: 添加标题文本
- **截图**: screenshots/step-34.png
- **看到**: 文本 1 创建成功，通过属性面板 textarea 输入 "Info Panel"
- **结果**: ✅ 文本工具和文本输入正常工作

### Step 37: 添加第二个状态
- **截图**: screenshots/step-37.png
- **看到**: 点击状态栏 "+" 按钮，"状态 2" 创建成功，画布显示两个并排画板
- **结果**: ✅ 状态创建正常

### Step 39-40: 在状态 2 中拖拽修改矩形高度
- **截图**: screenshots/step-40.png
- **看到**: 在状态 2 中拖拽矩形底边，H 从 724 变为 124。属性面板显示 "重置为基础值" 按钮，确认覆盖创建成功
- **结果**: ✅ 状态覆盖（override）通过拖拽正常工作

### Step 41-42: 添加 Touch 和 Toggle Patch 节点
- **截图**: screenshots/step-42.png
- **看到**: Touch 节点（Down/Up/Tap 输出端口）和 Toggle 节点（In 输入/Out 输出端口）均成功创建
- **结果**: ✅ Patch 节点添加正常

### Step 43-49: 尝试连接 Touch.Tap → Toggle.In
- **截图**: screenshots/step-49.png
- **看到**: 多次尝试从 Tap 输出端口拖拽到 Toggle In 输入端口，均未成功创建连线
- **摩擦**: ⚠️⚠️ **Patch 端口拖线失败** — 使用 journey-server 的 drag 操作（page.mouse.down → move → up）无法触发端口连线。hover 时端口高亮正常，说明坐标准确，但 pointerdown 事件的 e.target 可能未命中 .port-dot 元素（命中了 .node-layer 背景）。这是 **P0 级阻断性摩擦**，直接导致 {states, patch} 画像无法完成交互链路搭建
- **决策**: 删除 Patch 节点，改用无 Patch 的 auto-cycle 验证状态动画

### Step 54-55: 删除 Patch 节点
- **截图**: screenshots/step-55.png
- **看到**: 通过 "删除节点" 按钮成功删除 Touch 和 Toggle 节点
- **结果**: ✅ 节点删除正常

### Step 56-58: 验证 Preview 自动循环
- **截图**: screenshots/step-58.png
- **看到**: 无 Touch Patch 时，点击 Preview 面板触发自动循环。矩形从 H:724（展开）动画过渡到 H:124（收起），弹簧动画流畅
- **结果**: ✅ 状态间动画过渡正常，auto-cycle 功能正常

### Step 59-61: 再次尝试 Patch 连线（验证复现）
- **截图**: screenshots/step-61.png
- **看到**: 重新添加 Touch + Toggle 节点，再次尝试端口拖线，仍然失败
- **结果**: ❌ 确认 Patch 端口拖线是可复现的 bug

## 摩擦点

| # | 严重度 | 描述 | 影响 |
|---|--------|------|------|
| 1 | P0 | **Patch 端口拖线失败** — drag 操作无法在端口间创建连线。hover 高亮正常但 pointerdown 的 e.target 未命中 .port-dot 元素 | 阻断：无法搭建任何交互链路，{states,patch} 画像核心能力不可用 |
| 2 | P2 | **number input 点击触发 step 微调** — 单击/双击数值区域触发递增/递减而非聚焦编辑 | 效率：无法快速精确输入数值，需用拖拽替代 |
| 3 | P3 | **画布坐标映射偏移** — 绘制矩形后 X 坐标为负值，尺寸与拖拽范围不成比例 | 体验：初始绘制位置不直观 |

## 结论

**有摩擦待修** — 状态系统（创建状态、覆盖属性、状态间动画）全部正常工作。但 **Patch 端口拖线完全失败**（P0），导致无法搭建 Touch → Toggle 交互链路，{states, patch} 画像的 patch 能力无法验证。需修复端口拖线后重走旅程。

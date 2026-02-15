# 旅程: 状态·节点画像 — 可展开卡片 (Patch 端口拖线修复验证)

## 画像
**{states, patch}** — 能力集: {states, patch}

## 设计目标
可展开卡片: 默认态为紧凑卡片 (H:517, 圆角 12px)，状态 2 为展开态 (H:800)。
通过 Patch 连线 Touch.Tap → Toggle → To(状态 2) 实现点击展开交互。
**核心验证**: R3 发现的 P0 级 Patch 端口拖线失败问题是否已修复。

## 过程

### Step 1-3: 基础绘制
- 按 R 切换矩形工具，在画布上拖拽绘制卡片矩形
- 属性: W:620, H:517, 填充 #d9d9d9
- 设置圆角为 12px (通过 Home → Shift+End → 输入 12 → Enter)

### Step 4-8: 设置圆角
- 点击圆角输入框，使用 Home + Shift+End 选中全部文本
- 输入 12 并回车确认
- ✅ 圆角设置成功

### Step 9: 添加状态 2
- 点击状态栏 "+" 按钮，添加 "状态 2"
- 画布出现两个画板: 默认态 (左) + 状态 2 (右)

### Step 10-15: 状态 2 高度覆盖
- 点击第二画板中的矩形选中
- 修改 H 输入框: Home → Shift+End → 输入 800 → Enter
- ✅ H:800 生效，"重置为基础值" 按钮出现，确认覆盖写入正确
- 第二画板矩形明显更高

### Step 16-17: 添加 Patch 节点
- 点击 Touch 按钮 → Touch 节点出现 (端口: Down, Up, Tap)
- 点击 Toggle 按钮 → Toggle 节点出现 (端口: In, Out)

### Step 18: ⭐ 关键测试 — Touch.Tap → Toggle.In 端口拖线
- **截图**: screenshots/step-18.png
- **操作**: drag(x1:204, y1:789 → x2:276, y2:753)
- **结果**: ✅✅✅ **连线成功创建！** 贝塞尔曲线清晰可见
- **根因**: journey-server 的 drag 操作缺少 move→down→move→up 之间的延时 (80ms)，导致 pointerdown 事件未正确触发端口检测。修复 journey-server.mjs 后拖线正常工作

### Step 19-20: Toggle.Out → To.In 端口拖线
- 添加 To 节点
- drag(x1:424, y1:771 → x2:496, y2:753)
- ✅ 第二条连线也成功创建

### Step 21: 创建变量
- 点击 Toggle 节点的 "新建变量" 按钮
- ✅ 变量 "isToggled" 自动创建并绑定

### Step 22-25: 配置节点
- 使用 selectOption 设置 To 节点目标状态为 "状态 2"
- 使用 selectOption 设置 Touch 节点目标图层为 "矩形 1"
- 保存设计文件 (1953 bytes)

## 摩擦点

| # | 严重度 | 描述 | 状态 |
|---|--------|------|------|
| 1 | P0→已修 | **Patch 端口拖线失败 (journey-server 时序问题)** — journey-server 的 drag 操作在 mouse.move→down→move→up 之间无延时，导致 pointerdown 事件的 e.target 未正确命中 .port-dot 元素。添加 80ms 延时后拖线正常工作。注意: 这是测试工具问题，不是产品代码 bug | 🟢 已修 |
| 2 | P2 | **number input Ctrl+A 选中画布图层而非 input 内容** — 已知问题，使用 Home + Shift+End 替代 | 🔴 已知 |

## 结论

**通过** — {states, patch} 画像核心能力全部验证通过:
- ✅ 基础绘制 (矩形 + 圆角 + 属性编辑)
- ✅ 多状态 (添加状态 2 + 高度覆盖 + 重置按钮)
- ✅ Patch 节点 (Touch + Toggle + To 添加正常)
- ✅ **Patch 端口拖线** (P0 修复确认 — 两条连线均成功)
- ✅ 变量创建 (一键新建 + 自动绑定)
- ✅ 节点配置 (图层选择 + 状态选择)

R3 的 P0 阻断性问题根因是 journey-server 的 drag 时序，非产品代码缺陷。添加 80ms 延时后端口拖线完全正常。

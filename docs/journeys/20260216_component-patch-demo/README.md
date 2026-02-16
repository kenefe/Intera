# Journey: 组件 + Patch 交互演示

> **画像**: `{states, component, patch}`
> **日期**: 2026-02-16
> **设计目标**: 通知卡片组件 — 点击触发状态切换 (Touch → To)

---

## 完成情况

| 能力 | 状态 | 说明 |
|------|------|------|
| states | ✅ | 组件内 "默认" + "状态 2"，透明度覆盖 0.5 |
| component | ✅ | Frame 转组件，独立 StateGroup + group pill |
| patch | ✅ | Touch(容器1).Tap → To(状态2) 连线 + 数据正确 |

---

## 旅程步骤摘要

1. **绘制容器** — F 键 → 拖拽创建 Frame（圆角 12px）
2. **添加文本** — T 键 → 在容器内创建文本图层
3. **创建组件** — 右键容器 → "创建组件"
4. **添加第二状态** — 点击 "+" 添加 "状态 2"
5. **状态 2 覆盖** — 切到状态 2 → 修改透明度 = 0.5（◆ 关键帧标记出现）
6. **Touch 节点** — 选中容器 → 点击 Touch 按钮（自动绑定 layerId）
7. **To 节点** — 添加 To → selectOption 设置目标 "状态 2"
8. **连线** — 拖拽 Touch.Tap → To.In（连线成功，端口填充蓝色）
9. **数据验证** — evaluate 确认 stateId / groupId / connections 全部正确

---

## 摩擦点

### F-1: 预览交互未触发动画 (severity: HIGH)

**现象**: 在 Preview 面板点击容器区域，Touch.Tap → To 链路不执行动画。
通过 `evaluate` 手动调用 `fireTrigger` 可切换 `activeDisplayStateId`，
但 `liveStateId` 始终为 null，Folme 弹簧动画未启动。

**根因推测**: `executeTo` 在 Patch Runtime 中可能没有正确调用
Folme 的 `to()` 方法或 `liveStateId` setter，导致状态数据切换了
但视觉动画未执行。需进一步排查 `PatchRuntime.executeTo` 链路。

**附加因素**: 容器 x=-458 导致预览中图层大部分在屏幕左侧外，
`elementsFromPoint` 无法命中。这是容器初始创建位置的问题，
而非系统 bug。

### F-2: To 节点 <select> 在不同 group 上下文显示 "选择..."

**现象**: 在 "容器 1" 组设置 To.状态=状态 2 后，切回 "主画面" 组，
To 节点下拉显示 "选择..." 而非 "状态 2"。

**根因**: `states` computed 依赖 `activeGroup`，视图层状态列表
随组切换变化，但底层数据 (stateId/groupId) 保持正确。
这是 UI 显示问题，不影响运行时行为。

### F-3: 坐标系差异导致操作困难

**现象**: journey-server 返回的元素坐标是 1440×900 页面坐标，
但截图在聊天显示中被缩放，导致从截图估算坐标不准确。
需要始终使用 `elements` 返回的数据进行定位。

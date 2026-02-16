# 旅程: states, component — 多组件多状态封装验证

> Flow E 角色旅程 · 画像 `{states, component}` · 2026-02-16

## 验证目标

组件里面编辑了多关键帧（状态），主画面可以切换组件的不同状态。类似 OOP 的封装概念：组件有内部状态空间，外部通过交互触发状态切换。

## 组件矩阵

| 组件 | 默认状态 | 状态 2 | override 属性 |
|---|---|---|---|
| 容器 1 | opacity=1, borderRadius=8 | opacity=0.5, borderRadius=24 | opacity, borderRadius |
| 容器 2 | width=280 | width=200 | width |
| 主画面 | 容器 1 opacity=1 | 容器 1 opacity=0.5 | 容器 1.opacity |

## 验证清单

### 通过 ✓

| # | 验证项 | 步骤 | 确认方式 |
|---|---|---|---|
| 1 | Frame → 创建组件 | 右键 → "创建组件" | StateBar 出现 group-pill |
| 2 | 组件创建独立 StateGroup | 创建容器 1/容器 2 | 分别可见 group-pill |
| 3 | 组件内添加多状态 | 点击 + 按钮 | "默认" + "状态 2" tabs |
| 4 | 非默认状态修改创建 override | 修改 opacity/borderRadius/width | 橙色边框 + ↺ 重置按钮 |
| 5 | 切回默认状态恢复基础值 | 点击"默认" tab | opacity=1, borderRadius=8, 无重置按钮 |
| 6 | 多组件状态空间隔离 | 切换 group-pill | 各组件独立状态 tabs |
| 7 | Patch 节点创建 (Touch + To) | 点击工具栏按钮 | 节点出现在 Patch 画布 |
| 8 | Patch 连线 (Tap → In) | 拖线连接端口 | 蓝色曲线 + 端口填实 |
| 9 | To 节点状态选择 | selectOption action | 下拉框显示 "状态 2" |
| 10 | 手动状态切换 | 点击状态 tab | PREVIEW badge 变化 + 属性值变化 |
| 11 | 主画面对组件设 override | 在主画面状态 2 修改容器 1 opacity | ↺ 按钮出现, opacity=0.5 |
| 12 | 主画面状态隔离 | 切回默认 | opacity 恢复 1, 无重置按钮 |

### 摩擦点 / 待修

| # | 严重度 | 描述 | 根因 | 建议修法 |
|---|---|---|---|---|
| F1 | **P1** | To 节点无法选择其他组件的内部状态 | `PatchNode.states` computed 仅读取 `activeGroup.displayStates` | `states` 应根据 `config.groupId`（如有）解析目标组的状态列表；或新增"目标组"选择器 |
| F2 | **P1** | `onStatePick` 硬编码 `c.groupId = activeGroup.value?.id` | 选择状态时 groupId 固定为当前组 | 应允许用户选择目标 StateGroup，或自动匹配图层所属的组 |
| F3 | **P2** | KNOWN-ISSUES 标记 "To 节点跨组状态" 为已修但代码未改 | `PatchNode.vue` L200 仍用 `activeGroup.value` | 实现文档中描述的修法 |
| F4 | **P2** | 预览面板点击未触发 Patch 交互 | `interactiveLayerAt` 可能未命中缩放后的图层 DOM | 需调查 `elementsFromPoint` 在 CSS transform scale 下的行为 |

## 架构洞察

### 当前封装模型 (平坦覆盖)

```
主画面.状态2.overrides = {
  容器1: { opacity: 0.5 },  // 主画面级别重新定义
  容器2: { width: 200 }
}
```

每个 StateGroup 独立管理 overrides。主画面切状态时，直接覆盖子图层属性。这是**属性级封装**——简单直接，但需要在每个主画面状态中重复定义组件的属性差异。

### 理想封装模型 (状态引用)

```
主画面.状态2.refs = {
  容器1: "容器1.状态2",  // 引用组件内部状态
  容器2: "容器2.状态2"
}
```

主画面通过引用组件的内部状态来实现切换。组件内部属性差异只需定义一次。这是**状态级封装**——更接近 OOP 的 encapsulation。

### 实现差距

当前系统距离"状态级封装"的关键缺口：
1. **To 节点无跨组能力** — groupId 绑定 activeGroup
2. **无"组件状态引用"机制** — displayState 只存 overrides，不存对子组状态的引用
3. **预览交互断链** — 即使连了 Patch，预览点击未能触发状态转换

## 截图清单

| Step | 动作 | 验证点 |
|---|---|---|
| 91 | 添加 Touch 节点 | Down/Up/Tap 三端口 |
| 93 | 添加 To + 连线 | Touch.Tap → To.In 蓝色曲线 |
| 98 | To 选择状态 2 | 下拉框显示 "状态 2" |
| 100 | 手动切到状态 2 | PREVIEW badge = "状态 2" |
| 106 | 主画面 override | opacity=0.5 + ↺ 按钮 |
| 107 | 切回默认 | opacity=1, 无重置按钮 |

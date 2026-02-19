# Intera — 工作记忆 (Scratchpad)

> **给 AI 的指令：复杂任务的中间状态写在这里，跨会话持久化。**
> 每次新对话开始时，读完 `RELAY.md` 后也读一下这个文件，了解上次做到哪了。
> 任务完成后清空对应段落，保持文件简洁。

---

## 当前任务

**F200-F207 组件复用 (Component Reuse)** — 已完成代码+测试+build，需补齐文档同步

### 设计动机
用户体验矛盾：资深动效设计师需要复用交互组件（同一个按钮/卡片在多处使用），但当前 StateGroup 是独立的，改一处不会同步其他。
方案：master/instance 模式，instance 从 master 实时读取子树，改 master 全局同步。符合 Intera "渐进复杂度"承诺——Level 0 用户不受影响，组件复用是 Level 2 能力。

### 已完成
- [x] SceneTypes: ComponentDef + LayerType 'instance' + instanceOverrides
- [x] ComponentResolver: 递归解析 + wouldCycle 循环检测
- [x] useComponentActions: CRUD composable
- [x] Artboard: 渲染 instance
- [x] clonePatches: Patch 子图克隆
- [x] LayerIcon: 菱形图标
- [x] CanvasViewport: 右键创建组件
- [x] BDD 3/3 通过
- [x] CODE-MAP.md + ARCHITECTURE.md 已更新

### 待完成
- [ ] docs/UI-DESIGN.md 更新（instance 图层类型 + 右键菜单 + 属性面板）
- [ ] docs/KNOWN-ISSUES.md 检查
- [ ] SCRATCHPAD 清空（全部完成后）

## 架构决策备忘

**Design Token 体系** (commit 384744e)
- CSS 自定义属性 > JS 变量 — 零运行时，CSS 继承自动生效，未来可主题切换
- LayerIcon 语义色保留硬编码 — 功能色不属于全局 token

**BehaviorDrag 值端口 + Transition 节点** — 可组合拖拽插值

**Component Reuse 架构决策** (commit 30bf852)
- instance 不存子树，渲染时从 master 实时读取 → 天然支持编辑同步
- Patch 克隆在 PatchRuntime.rebuild 时注入，不改核心逻辑
- 循环检测用 DFS，depth 限制 10 层

## 待验证项

- [ ] 预存 TS 错误 usePreviewGesture.ts:75 — activeDisplayStateId 可能为 null（非本次改动引入）

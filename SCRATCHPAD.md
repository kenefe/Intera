# Intera — 工作记忆 (Scratchpad)

> **给 AI 的指令：复杂任务的中间状态写在这里，跨会话持久化。**
> 每次新对话开始时，读完 `RELAY.md` 后也读一下这个文件，了解上次做到哪了。
> 任务完成后清空对应段落，保持文件简洁。

---

## 当前任务

无。等待下一轮 feature 指令。

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

_(全部清空，零待验证)_

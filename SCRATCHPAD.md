# Intera — 工作记忆 (Scratchpad)

> **给 AI 的指令：复杂任务的中间状态写在这里，跨会话持久化。**
> 每次新对话开始时，读完 `RELAY.md` 后也读一下这个文件，了解上次做到哪了。
> 任务完成后清空对应段落，保持文件简洁。

---

## 当前任务

_（空 = 没有进行中的任务）_

## 架构决策备忘

**Design Token 体系** (commit 384744e)
- CSS 自定义属性 > JS 变量 — 零运行时，CSS 继承自动生效，未来可主题切换
- LayerIcon 语义色保留硬编码 — 功能色不属于全局 token

**BehaviorDrag 值端口 + Transition 节点** — 可组合拖拽插值
- BehaviorDrag 输出 x/y/offsetX/offsetY 四个 number 端口
- Transition 节点接收连续值 → inputRange 映射为 [0,1] → 在两个状态间插值
- PatchRuntime.setValue() 实现值传播 (非 pulse)
- BehaviorManager.onMove 回调写入值端口
- 插值由 patch.ts store 的 onDrive 回调执行 → liveValues
- usePreviewGesture 仅在无 Transition 连线时回退为基本 x/y

## 待验证项

- [ ] 预存 TS 错误 usePreviewGesture.ts:75 — activeDisplayStateId 可能为 null（非本次改动引入）

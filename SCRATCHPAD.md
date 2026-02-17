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

## 待验证项

- [ ] 预存 TS 错误 usePreviewGesture.ts:75 — activeDisplayStateId 可能为 null（非本次改动引入）

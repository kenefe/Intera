---
description: Intera 项目 — 启动门禁 (不可绕过)
globs:
  - "**/*.ts"
  - "**/*.vue"
  - "**/*.css"
alwaysApply: true
---

# ⛔ 启动门禁

> **即使有 conversation summary，也必须执行以下 3 步。**
> Summary 是过期快照，不是实时状态。SCRATCHPAD.md 可能已被其他 agent 或用户修改。
> "summary 里有了" / "看起来简单" / "上轮已读过" 都不是跳过的理由。

## 写任何代码之前

1. **读 `RELAY.md`** — 确认任务类型，找到路由文档
2. **读 `SCRATCHPAD.md`** — 确认是否有未完成的工作
3. **第一条回复引用 SCRATCHPAD.md「当前任务」段落** — 引用内容 = 证明已读

## 合规输出格式

```
> SCRATCHPAD 当前任务: （引用原文，空则写"无进行中任务"）
```

未包含此引用的第一条回复 = 违规。

## 完整规则

`AGENTS.md` — 铁律 / 任务路由 / 提交流程 / 编码约束

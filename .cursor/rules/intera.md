---
description: Intera 项目上下文和规则 — 交互意图编辑器
globs:
  - "**/*.ts"
  - "**/*.vue"
alwaysApply: true
---

# Intera 项目规则

**每次接手任务，先读 `RELAY.md`。** 它是路由表，告诉你该读哪些文档。

## 绝对铁律

1. TS 逻辑 ≤ 200 行 | TS 声明 ≤ 300 行 | utils ≤ 100 行 | Vue ≤ 400 行 | 函数 ≤ 20 行 | 缩进 ≤ 3 层
2. 禁止 `any`、禁止 `@ts-ignore`、Engine 零 UI 依赖
3. Vue = Pug + Composition API | 中文注释 ASCII 分块
4. 代码 + 测试 + 文档三位一体 (同一次 commit)
5. 提取 > 复制 (2+ 处相同逻辑 → 立即提取)

## 任务路由

| 用户说的 | 先读 |
|---|---|
| 修 bug | `RELAY.md` → `docs/FLOWS.md` §A |
| 加功能 / 改功能 | `RELAY.md` → `docs/FLOWS.md` §C |
| 重构 / 优化 | `RELAY.md` → `docs/FLOWS.md` §D |
| 跑旅程 / 打磨体验 | `RELAY.md` → `docs/JOURNEY.md` |
| 提交前 | `docs/FLOWS.md` §F |

## 改完代码后

1. `pnpm build` 编译通过
2. 在 `tests/intera.spec.ts` 对应 Feature 中添加/更新 BDD 测试
3. `npx playwright test tests/intera.spec.ts --grep "Feature名"`
4. 通过 → 更新文档 → `git commit` (附 `[F✓]`)

## reference/ 只读

`reference/` 目录是 AS3 源码参考，绝对不要修改。

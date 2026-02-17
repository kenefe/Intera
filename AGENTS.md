# Intera — AI Agent 指令

> 本文件是所有 AI agent (OpenClaw / Claude Code / Codex / 其他) 的通用入口。
> Cursor 用户: 规则已通过 `.cursor/rules/intera.md` 自动加载，本文件可跳过。

## ⛔ 启动序列 (写任何代码之前，必须完成，无例外)

1. **读 `RELAY.md`** — 确认你是谁、任务类型、按路由表找到对应文档
2. **读 `SCRATCHPAD.md`** — 确认上次进度，是否有未完成的工作
3. **读路由表指向的文档** — 按 RELAY.md 的任务路由，只读对应章节
4. **向用户说明方案** — 确认后再动手写代码

⛔ 跳过任何一步直接写代码 = 违规。"看起来简单"不是跳过的理由。

## 绝对铁律

1. TS 逻辑 ≤ 200 行 | TS 声明 ≤ 300 行 | utils ≤ 100 行 | Vue ≤ 400 行 | 函数 ≤ 20 行 | 缩进 ≤ 3 层
   — 超过阈值 code review 认知负荷断崖上升，bug 藏身概率指数增长
2. 禁止 `any`、禁止 `@ts-ignore`、Engine 零 UI 依赖
   — any 侵蚀重构安全网；引擎零 UI 依赖是为了未来多渲染目标
3. Vue = Pug + Composition API | 中文注释 ASCII 分块
   — 统一风格降低切换成本，分块注释让长文件可速览
4. 代码 + 测试 + 文档三位一体 (同一次 commit)
   — 分离提交会产生"文档漂移"，下个 AI 进来就被过期文档误导
5. 提取 > 复制 (2+ 处相同逻辑 → 立即提取)
   — "先复制后整理"的整理永远不会来，第二天就出现不一致 bug

## 不要做

1. 不要为了"灵活性"增加未被需求驱动的抽象层 — 解决真实问题，不是假设中的威胁
2. 不要把一个简单修复拆成多个文件 — 一个文件能搞定就不要拆成三个模块
3. 不要在没有明确需求时引入新依赖 — 每个依赖都是维护债务
4. 修 bug 时不要顺手重构不相关代码 — 混合提交让 git bisect 失效
5. 不要生成超过需求的代码 — 没人要求的功能就是技术债务

## 上下文管理

- **一功能一对话** — 不要在同一对话中混合不相关任务，上下文污染导致低级错误
- **外部记忆** — 复杂任务的架构决策和中间进度写入 `SCRATCHPAD.md`，不靠对话记忆
- **RELAY.md 是恢复点** — 新对话从 RELAY.md 开始，不需要用户重复背景

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

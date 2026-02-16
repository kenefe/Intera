# Intera — 维护流程

> 代码维护的标准操作流程。每个 Flow 是一个独立工作单元。
> 旅程探索 (Flow E) 在 `docs/JOURNEY.md`。

---

## 铁律: 每次改完都提交 Git

**所有流程的最后一步都是 git commit。不提交 = 没做过。**

```
提交前自检 → docs/RULES.md 八、自检清单
提交格式  → fix: / feat: / refactor: / test: / docs: + 简述
提交范围  → 代码 + 测试 + 文档一起提交，保持原子性
```

---

## Flow A: 修 Bug

```
1. 理解 bug 描述 (现象 + 期望 + 复现步骤)
2. pnpm dev 跑起来，复现问题
3. 定位根因 — 不是打补丁！找到"为什么"
4. 先说修复思路，用户确认后动手
5. 修改代码，pnpm build 编译通过
6. 【BDD 自动生成】在 tests/intera.spec.ts 对应 Feature 中自动添加回归测试:
   - 测试名: 描述修复后的正确行为 (不是描述 bug)
   - 必须覆盖触发 bug 的操作路径
7. 运行: npx playwright test tests/intera.spec.ts --grep "对应Feature"
8. 【文档同步】全部通过后，更新受影响的文档:
   - docs/KNOWN-ISSUES.md — 必更新 (从待修移到已修)
   - docs/UI-DESIGN.md — 若修复改变了 UI 行为
   - docs/ARCHITECTURE.md — 若修复涉及架构/数据流变更
   - docs/CODE-MAP.md — 若新增/重命名了文件或模块
9. 【Git 提交】git add + commit，格式: fix: 简述修复内容
   代码 + 测试 + 文档一起提交，保持原子性
```

---

## Flow B: UX 验收

```
1. pnpm dev 跑起来
2. 读 docs/UI-DESIGN.md (界面规格)
3. 运行全量 BDD: npx playwright test tests/intera.spec.ts
4. 查看截图: tests/screenshots/*.png
5. 逐项对照 UI-DESIGN.md 检查各项功能
6. 【BDD 自动补全】发现未覆盖的场景 → 自动生成测试添加到对应 Feature
7. 再次运行全量 BDD，确认新增测试通过
8. 输出: 问题清单 + BDD 通过率
9. 【Git 提交】git add + commit，格式: test: UX 验收补全 BDD 覆盖
```

---

## Flow C: 改功能 / 加功能

```
1. 理解需求
2. 读相关文档 + 源码 + reference/ 下的 AS3 参考
3. 先说思路和影响范围，用户确认后再动手
4. 改完 pnpm build 编译通过
5. 【BDD 自动生成】分析新功能行为，自动生成测试:
   - 新功能 → 在对应 Feature 区块新增 test()
   - 如果是全新模块 → 新增 test.describe('Feature: XXX') 区块
6. 运行: npx playwright test tests/intera.spec.ts --grep "对应Feature"
7. 全部通过才算完成
8. 【文档同步】更新受影响的文档 (缺一不可):
   - docs/UI-DESIGN.md — 新增/修改 UI 元素、交互描述
   - docs/ARCHITECTURE.md — 新增模块、数据流变更
   - docs/KNOWN-ISSUES.md — 若解决了已知问题 / 产生新限制
   - docs/CODE-MAP.md — 新增文件、模块入口变更
9. 【Git 提交】git add + commit，格式: feat: 简述新功能
   代码 + 测试 + 文档一起提交，保持原子性
```

---

## Flow D: 重构 / 优化

```
1. 说明为什么要重构 + 列出影响范围
2. 重构前跑全量 BDD 基线: npx playwright test tests/intera.spec.ts (记录通过数)
3. 分步执行，每步编译通过
4. 每步完成后跑受影响的 Feature 测试
5. 全部完成后跑全量 BDD，通过数 ≥ 基线
6. 【BDD 自动修正】如果重构导致测试失败:
   - 行为不变 → 只更新测试中的选择器/断言 (适配新结构)
   - 行为有变 → 更新测试反映新行为，并向用户确认
7. 【文档同步】更新受影响的文档:
   - docs/ARCHITECTURE.md — 结构/命名/模块边界变更
   - docs/CODE-MAP.md — 文件重命名、目录调整
   - docs/UI-DESIGN.md — 若重构改变了组件接口或交互
8. 【Git 提交】git add + commit，格式: refactor: 简述重构内容
   代码 + 测试 + 文档一起提交，保持原子性
```

---

## Flow F: 提交自审 (每次 commit 前必做)

> 每次 `git add` 之后、`git commit` 之前，逐项确认。
> 任何一项未通过 → 先修再提交。不允许"先提交后补"。

```
自审 Checklist:

□ 三位一体
  - [ ] 代码改了 → 对应 BDD 测试有没有？
  - [ ] 文档需不需要更新？逐个检查:
        UI-DESIGN.md    — UI/交互/快捷键变更
        ARCHITECTURE.md — 数据流/模块/架构变更
        CODE-MAP.md     — 代码地图/文件变更
        KNOWN-ISSUES.md — Bug修复/新发现问题
  - [ ] 代码+测试+文档在同一次 commit 中

□ 编码铁律
  - [ ] 纯 TS ≤ 200 行？Vue SFC ≤ 400 行？
  - [ ] 函数 ≤ 20 行？缩进 ≤ 3 层？
  - [ ] 无 any / 无 @ts-ignore？
  - [ ] Engine 层无 UI 依赖？

□ 代码卫生
  - [ ] git diff 中有无重复函数/CSS？(→ 提取为共享模块)
  - [ ] 新文件放对目录了？(tests/ scripts/ docs/ 职责分明)
  - [ ] 有无残留的临时文件？(repro-* / debug 截图)

□ 质量
  - [ ] pnpm build 编译通过？
  - [ ] 相关 Feature BDD 测试通过？
  - [ ] git diff 里有没有遗漏的文件？
```

**执行方式**: AI 在 commit message 末尾附加 `[F✓]` 标记表示已完成自审。
缺少 `[F✓]` 的 commit 在 Flow G review 时会被标记为违规。

**自动化强制执行** (git hooks):
- `.githooks/pre-commit` — 检查三位一体 + 文件行数 + any/ts-ignore + 目录卫生
- `.githooks/commit-msg` — 检查 commit message 包含 `[F✓]`
- 安装: `git config core.hooksPath .githooks`
- 紧急跳过: `git commit --no-verify`（仅紧急情况，Flow G 会追溯）

---

## Flow G: 定期 Review (每 10 commits 或每轮 Flow E 后)

> 触发条件: (1) 累计 10 个新 commit (2) 每轮 Flow E 结束后 (3) kenefe 要求时
> 目的: 兜底审查，防止自审遗漏

```
Review 流程:

1. 列出待审 commits: git log --oneline (上次 review 之后的)
2. 逐个检查三位一体:
   - git show --stat <hash> → 有代码改动的 commit 是否包含测试和文档？
   - 缺失的标记为 ❌，记录到 review report
3. 文档一致性检查:
   - docs/CODE-MAP.md vs 实际文件 (find src -name "*.ts" -o -name "*.vue")
   - docs/TESTING.md BDD 覆盖表 vs 实际测试数
   - docs/RULES.md 行数限制 vs 实际文件行数
3b. 代码卫生审查:
   - rg 搜索重复函数签名 (跨文件 DRY 检查)
   - 检查 tests/ 目录是否只有 .spec.ts + screenshots/ + 已知脚本
   - 检查是否有遗留的 repro-/demo- 临时文件
4. 全量 BDD 回归: npx playwright test tests/intera.spec.ts
5. 结构测试: npx playwright test tests/structure.spec.ts
6. 输出 Review Report:
   - 违规 commits 列表 + 需要补的内容
   - 文档不一致项
   - 代码卫生问题
   - BDD 通过率
7. 修复所有违规项
8. git commit -m "review: 第N轮审查修复 [F✓]"
```

**Review Report 格式**:
```
## Review #N — YYYY-MM-DD

审查范围: <commit_from>..<commit_to> (N commits)

### 三位一体合规
| Commit | 代码 | 测试 | 文档 | 判定 |
|--------|------|------|------|------|
| abc1234 feat: xxx | ✅ | ❌ | ❌ | 违规 |

### 文档一致性
- CODE-MAP.md: ✅/❌ (缺 N 个文件)
- BDD 覆盖表: ✅/❌ (实际 M 项 vs 记录 K 项)
- RULES.md 行数: ✅/❌ (N 个文件超标)

### 代码卫生
- DRY 违规: N 处
- 目录卫生: ✅/❌
- 临时文件: ✅/❌

### BDD 回归
- 通过: M/N

### 修复项
1. ...
```

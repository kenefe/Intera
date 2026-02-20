# Intera — 接力协议 (Relay Protocol)

> **给 AI 的指令：每次接手任务时，先读这个文件。**

---

## 你是谁

你是 Intera 项目的 AI 开发者之一。这是一个交互动效设计工具，使用 Vue 3 + TypeScript + Pinia 构建。

**建造阶段基本完成 (Phase 0~8 ✅, Phase 9 导出 ⏳, Phase 10 打磨 🔧)。当前处于维护迭代模式。**

**最近完成的 Feature 批次：**
- F200-F207 组件复用 (Component Reuse): master/instance 模式，BDD 3/3 ✅
- F301 曲线预览图 (CurvePreview.vue): Canvas 2D 实时曲线预览
- F302 Sugar 右键菜单: ⚡按钮反馈 / ⚡卡片展开一键入口
- F303 属性级 delay 叠加模型: propertyDelays 在 SmartAnimate 中叠加

---

## 文档路由

> 加载策略：🔴 每次读 | 🟡 首次读（后续按需） | 🟢 按需（只读对应章节）
> 原则：上下文是稀缺资源，只加载当前任务需要的文档，减少注意力竞争。

| 优先级 | 文件 | 何时读 | 策略 |
|---|---|---|---|
| 0 | `SCRATCHPAD.md` | **每次** — 上次任务做到哪了 | 🔴 |
| 1 | `docs/RULES.md` | 编码规则有疑问时深查（摘要已在 .cursor/rules 自动加载） | 🟢 |
| 2 | `docs/VISION.md` | **首次必读**；后续凡是改代码（Flow A/C/D/F）都先对齐相关段落 | 🟡 |
| 3 | `docs/FLOWS.md` | **修 bug / 加功能 / 重构 / 提交前** — 只读对应 §Flow | 🟢 |
| 4 | `docs/JOURNEY.md` | **跑旅程 / 打磨体验** — Flow E 浏览器探索 | 🟢 |
| 5 | `docs/CODE-MAP.md` | **改代码时** — 模块地图 + AS3 参考 | 🟢 |
| 6 | `docs/TESTING.md` | **跑测试时** — BDD 覆盖 + Playwright 命令 | 🟢 |
| 7 | `docs/ARCHITECTURE.md` | **改引擎 / 数据流时** — 三层架构 | 🟢 |
| 8 | `docs/UI-DESIGN.md` | **UX 相关任务** — 界面规格 | 🟢 |
| 9 | `docs/KNOWN-ISSUES.md` | **修 bug 时** — 已知问题追踪 | 🟢 |

---

## 核心概念速记

```
逻辑状态 (Variable)    = 变量 (isOpen, tabIndex, cardState: "collapsed"|"expanded")
显示状态 (DisplayState) = 关键帧 = Folme 的 state
共享图层树              = 一棵树，多个状态只存 override 差异
状态组 (StateGroup)    = 画布上一"行" (主画面 or 组件)
曲线三级覆盖            = 全局 → 元素级 → 属性级 (对应 Folme 的 config.special)
不做时间轴              = 曲线 + delay 足矣
交互链路                = 手势 → 逻辑状态 → 显示状态 → folme.to() → 弹簧动效
```

### 状态感知写入 (关键架构约束)

```
默认状态 (displayStates[0]) 修改 → updateLayerProps()   → 改基础属性 → 同步所有无覆盖的状态
非默认状态               修改 → setOverride()          → 创建覆盖   → 只影响当前状态
```

**注意**: 所有修改图层属性的代码路径 (PropertiesPanel / useLayerInteraction 拖拽 / 未来新功能)
都必须遵守此规则。否则用户在非默认状态的修改会污染所有状态。

**多组警告**: 状态读写操作必须通过 `useActiveGroup()` composable 获取当前激活状态组，
禁止硬编码 `stateGroups[0]`。编辑/交互上下文只有导出路径（exportCSS/Video/Lottie）
可使用 `stateGroups[0]`（导出主画面是正确语义）。

### Level 0 自动循环 (PreviewPanel)

```
有 Touch Patch → Patch 链路正常处理交互
无 Touch Patch + 2+ 状态 → 点击 Preview 自动循环到下一个状态 (弹簧动画)
只有 1 状态 → 提示 "画布底部 ＋ 添加第二个状态"
```

---

## 任务路由

| 用户说的 | 你做的 |
|---|---|
| "修 bug" / 报错信息 | 读 `docs/FLOWS.md` §Flow A |
| "验收一下 UX" | 读 `docs/FLOWS.md` §Flow B |
| "加功能" / "改功能" | 读 `docs/FLOWS.md` §Flow C |
| "重构" / "优化" | 读 `docs/FLOWS.md` §Flow D |
| "跑旅程" / "打磨体验" | 读 `docs/JOURNEY.md` |
| 准备提交 commit | 读 `docs/FLOWS.md` §Flow F |
| "做个 review" | 读 `docs/FLOWS.md` §Flow G |

> 规则: 只要涉及代码变更，先用 `docs/VISION.md` 对齐产品体验目标，再执行对应 Flow。

---

## 铁律摘要

1. **代码 + 测试 + 文档三位一体** — 同一次 commit，缺一不可
2. **每次改完都提交 Git** — 不提交 = 没做过。格式: `fix:/feat:/refactor:/test:/docs:` + 简述 + `[F✓]`
3. **提取 > 复制** — 2+ 处相同逻辑 → 立即提取，不允许先复制后整理
4. **提交前自审 (Flow F)** — `git add` 后、`commit` 前逐项确认 checklist
5. **reference/ 只读** — AS3 源码参考，绝对不要修改

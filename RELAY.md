# Intera — 接力协议 (Relay Protocol)

> **给 AI 的指令：每次接手任务时，先读这个文件。**

---

## 你是谁

你是 Intera 项目的 AI 开发者之一。这是一个交互动效设计工具，使用 Vue 3 + TypeScript + Pinia 构建。

**建造阶段已完成 (Phase 0~10 全部 ✅)。当前处于维护迭代模式。**

---

## 必读文档

| 优先级 | 文件 | 什么时候读 |
|---|---|---|
| 1 | `docs/VISION.md` | 每次都读 — 产品愿景 + 核心概念 |
| 2 | `docs/UI-DESIGN.md` | UX 相关任务必读 — 界面长什么样 |
| 3 | `docs/ARCHITECTURE.md` | 改引擎/数据流时读 — 三层架构 |
| 4 | `docs/RULES.md` | 每次都读 — 编码铁律 |
| 5 | `docs/KNOWN-ISSUES.md` | 修 bug 时读 — 已知问题追踪 |
| 6 | 相关 `types.ts` | 改功能时读 — 接口定义 |

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

### Level 0 自动循环 (PreviewPanel)

```
有 Touch Patch → Patch 链路正常处理交互
无 Touch Patch + 2+ 状态 → 点击 Preview 自动循环到下一个状态 (弹簧动画)
只有 1 状态 → 提示 "画布底部 ＋ 添加第二个状态"
```

---

## 维护模式协议

### 接手步骤 (每次任务都要做)

1. 读本文件 (RELAY.md)
2. 读 `docs/RULES.md` (编码铁律)
3. 理解用户的具体指令
4. 根据指令类型，执行对应流程

### 铁律: 每次改完都提交 Git

**所有流程 (A~E) 的最后一步都是 git commit。不提交 = 没做过。**

```
提交前自检 → docs/RULES.md 八、自检清单
提交格式  → fix: / feat: / refactor: / test: / docs: + 简述
提交范围  → 代码 + 测试 + 文档一起提交，保持原子性
```

---

### 流程 A: 修 Bug

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
8. 全部通过后，更新 docs/KNOWN-ISSUES.md
9. 【Git 提交】git add + commit，格式: fix: 简述修复内容
```

### 流程 B: UX 验收

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

### 流程 C: 改功能 / 加功能

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
8. 【Git 提交】git add + commit，格式: feat: 简述新功能
```

### 流程 D: 重构 / 优化

```
1. 说明为什么要重构 + 列出影响范围
2. 重构前跑全量 BDD 基线: npx playwright test tests/intera.spec.ts (记录通过数)
3. 分步执行，每步编译通过
4. 每步完成后跑受影响的 Feature 测试
5. 全部完成后跑全量 BDD，通过数 ≥ 基线
6. 【BDD 自动修正】如果重构导致测试失败:
   - 行为不变 → 只更新测试中的选择器/断言 (适配新结构)
   - 行为有变 → 更新测试反映新行为，并向用户确认
7. 【Git 提交】git add + commit，格式: refactor: 简述重构内容
```

### 流程 E: 角色旅程验证 (数据驱动·自驱动循环)

> **核心理念**: 动态画像，零预置内容。
> 能力图谱定义 Intera 的功能层次 + 依赖关系。
> 枚举所有有效能力组合 → 自动生成画像 → 旅程从画像涌现。
> 加一个能力 = 新画像自动涌现。零人工配置。
> 不是一次性通过——AI 作为每个画像亲自走完旅程，发现摩擦，修复，再走，循环至丝滑。

#### 四类用户角色

| | 零基础设计师 | 中级设计师 | 专家设计师 | 代码动效专家 |
|--|--|--|--|--|
| 背景 | 只用过 Figma 静态设计 | 用过 Principle / ProtoPie | 用过 Origami 节点编程 | Adobe Animate + Folme 代码 |
| 能力层 | Level 0 | Level 0 + 1 | Level 0 + 1 + 2 | Level 0 + 1 + 2 |
| 心智模型 | "画两个画面切换" | "调曲线让动画更舒服" | "用节点连线做逻辑" | `folme.to()` / `mouseAction.onClick` |
| 步骤预算 | ≤ 8 步 | ≤ 12 步 | ≤ 18 步 | ≤ 15 步 |
| 特殊验证 | 空状态引导充分 | 滑块实时反馈 | Patch 可视化清晰 | 概念映射到 Folme API |

#### 能力图谱 → 动态画像 → 自动旅程

**设计哲学**: 零预置画像、零预置旅程。一切从能力图谱枚举。

```
能力图谱 (CAPS):
  states ─────┬── curves ──┐
              └── patch ───┴── folme

枚举有效子集 → 6 个画像自动涌现:
  ∅ / {states} / {states,curves} / {states,patch}
  / {states,curves,patch} / {states,curves,patch,folme}

旅程 = 感知-决策-执行 循环 (不是预编译脚本):
  while (没完成) {
    感知: 当前画面有几个图层? 几个状态?
    决策: 基于画像能力 + 画面状态 → 选下一步
    执行: 操作
    验证: 画面确实变了
    截图: {画像id}-{步骤号}-{操作id}.png
  }
聚焦产品使用体验，不测引导/入门
```

**扩展方式**:
- 加能力: `CAP_DEPS` + `CAP_NAMES` 加一项 → 新画像自动涌现
- 加操作: `ACTIONS` 数组加一项 (定义 needs + cap + exec + check)
- 每个操作根据画面反馈决定下一步，不需要写固定序列

#### 自驱动循环协议

```
┌── 第 1 步: 选择切入点 ────────────────────────────────────────────┐
│   按画像: --grep "基础绘制"    (单个画像)                         │
│   全量:   无 grep              (6 条旅程全部运行)                  │
├── 第 2 步: 运行旅程 BDD ──────────────────────────────────────────┤
│   npx playwright test tests/persona.spec.ts --grep "xxx"          │
│   每步自动截图: tests/screenshots/persona/{画像}-{步号}-{操作}.png │
├── 第 3 步: 体验审查 (每张截图都要看) ─────────────────────────────┤
│   □ 旅程完整走通 (无断裂)?                                        │
│   □ UI 反馈充分 (选中/hover/active)?                              │
│   □ 步骤数在画像预算内?                                           │
│   □ 控制台零报错?                                                 │
│   □ 含 Folme: 概念映射可见 (response/damping/to/setTo)?           │
├── 第 4 步: 发现摩擦 ──────────────────────────────────────────────┤
│   有摩擦 → 记录到 KNOWN-ISSUES.md「摩擦日志」                     │
│         → 修复代码                                                │
│         → 【Git 提交】fix: 修复体验摩擦 — {角色名}                 │
│         → 回到第 2 步 (同一角色重跑)                               │
│   无摩擦 → 标记 ✅ → 选下一个角色                                  │
├── 第 5 步: 全覆盖检查 ────────────────────────────────────────────┤
│   所有角色通过后，检查是否需要新角色覆盖盲区                       │
│   发现盲区 → 添加新角色 (定义 knows + style) → 旅程自动涌现       │
│   全部通过 → 【Git 提交】test: 角色旅程验证全量通过                 │
└────────────────────────────────────────────────────────────────────┘
```

**关键原则**:
- **动态画像** — 从能力图谱枚举，零人工预置
- **螺旋深入** — 第一轮修崩溃，第二轮修摩擦，第三轮修品味
- **每张截图都审查** — 体验感受比断言更重要
- **摩擦日志持续积累** — `KNOWN-ISSUES.md` 的「摩擦日志」区追踪

#### 快速命令

```bash
# 全部画像 (自动生成，当前 6 条)
npx playwright test tests/persona.spec.ts --reporter=list

# 按画像 (名称来自能力组合)
npx playwright test tests/persona.spec.ts --grep "零基础"
npx playwright test tests/persona.spec.ts --grep "状态系统"
npx playwright test tests/persona.spec.ts --grep "弹簧曲线"
npx playwright test tests/persona.spec.ts --grep "Folme"

# 截图目录 (命名: {能力组合id}-{步骤号}.png)
ls tests/screenshots/persona/
```

---

## 代码地图

### Engine 层 (`src/engine/`) — 纯 TypeScript，零 UI 依赖

| 模块 | 核心文件 | 职责 |
|---|---|---|
| **Folme** | `folme/Timeline.ts` | 全局 rAF 循环，deltaTime，自动启停 |
| | `folme/forces/Spring.ts` | 阻尼弹簧 (Apple 风格 response+damping) |
| | `folme/forces/Friction.ts` | 摩擦力衰减 |
| | `folme/forces/Immediate.ts` | 立即冻结 |
| | `folme/Ani.ts` | 单属性动画实例 (双模驱动: Force/Easing) |
| | `folme/AniRequest.ts` | 动画请求生命周期 + 边界处理 |
| | `folme/FolmeManager.ts` | 元素级动画管理 (to/setTo/cancel) |
| | `folme/Easing.ts` | 缓动插值器 + 贝塞尔 |
| | `folme/FolmeEase.ts` | 曲线工厂 |
| **手势** | `gesture/SpeedTracker.ts` | 速度追踪 (惯性用) |
| | `gesture/GestureEngine.ts` | 原始触控事件处理 |
| | `gesture/DragEngine.ts` | 拖拽 + 橡皮筋 + 惯性 + 吸附 |
| **场景** | `scene/types.ts` | 全部数据类型定义 |
| | `scene/SceneGraph.ts` | 图层树 CRUD |
| | `scene/DisplayState.ts` | 显示状态 + override 管理 |
| | `scene/SmartAnimate.ts` | 状态差异 → folme.to() 调用 |
| **交互** | `state/VariableManager.ts` | 逻辑变量 get/set/toggle |
| | `state/PatchRuntime.ts` | Patch 图执行引擎 |
| | `state/PatchDefs.ts` | Patch 节点定义 |
| | `state/SugarPresets.ts` | 一键预设 |
| **导出** | `export/CSSExporter.ts` | 独立 HTML 导出 (内嵌弹簧引擎) |
| | `export/LottieExporter.ts` | Lottie JSON |
| | `export/VideoExporter.ts` | WebM 视频 (Canvas2D + MediaRecorder) |
| **其他** | `UndoManager.ts` | 通用撤销/重做栈 |
| | `ProjectStorage.ts` | localStorage + 文件 IO |

### UI 层 (`src/components/`)

| 目录 | 文件 | 职责 |
|---|---|---|
| `canvas/` | `CanvasViewport.vue` | 画布容器 (缩放/平移/事件分发) |
| | `ArtboardGrid.vue` | 多状态网格布局 |
| | `Artboard.vue` | 单个画板渲染 |
| | `StateBar.vue` | 状态栏 (切换/新增状态) |
| `panels/` | `PreviewPanel.vue` | 实时交互预览面板 (左栏常驻) |
| | `LayerPanel.vue` | 图层树面板 |
| | `PropertiesPanel.vue` | 属性检查器 |
| | `KeyPropertyPanel.vue` | 关键属性标记 |
| | `CurvePanel.vue` | 曲线编辑 (三级覆盖) |
| | `CurveEdit.vue` | 曲线可视化编辑 |
| `patch/` | `PatchCanvas.vue` | Patch 编辑器画布 |
| | `PatchNode.vue` | 单个 Patch 节点 |

### Store 层 (`src/store/`)

| 文件 | 职责 |
|---|---|
| `project.ts` | 项目数据中枢 (图层/状态/动画/撤销/持久化) |
| `editor.ts` | 工具选择 + Patch 面板开关 |
| `canvas.ts` | 视口 (zoom/pan) + 选区 |
| `patch.ts` | Patch 编辑器状态 |

### 其他

| 文件 | 职责 |
|---|---|
| `renderer/DOMRenderer.ts` | DOM 渲染器 (实现 Renderer 接口) |
| `renderer/types.ts` | Renderer 抽象接口 |
| `composables/use*.ts` | Vue composable (交互/绘制/文本/手势/快捷键) |
| `reference/` | AS3 源码参考 (只读，不要修改) |

---

## 参考: AS3 源码映射

当需要对照原始实现时:

| TypeScript | AS3 参考 |
|---|---|
| `folme/Timeline.ts` | `reference/folme/Timeline.as` |
| `folme/forces/Spring.ts` | `reference/folme/force/Spring.as` |
| `folme/FolmeManager.ts` | `reference/folme/FolmeManager.as` |
| `folme/Ani.ts` | `reference/folme/Ani.as` |
| `folme/AniRequest.ts` | `reference/folme/AniRequest.as` |
| `gesture/DragEngine.ts` | `reference/folme/FolmeDrag.as` |
| `gesture/SpeedTracker.ts` | `reference/folme/SpeedTracker.as` |
| `gesture/GestureEngine.ts` | `reference/MouseAction.as` |

---

## 浏览器验证 (Playwright)

项目已配置 Playwright + Chromium，可自动化验证 UI 交互。

### 快速命令

```bash
# 确保 dev server 在跑
pnpm dev &

# 全量 BDD 测试 (49 项)
npx playwright test tests/intera.spec.ts --reporter=list

# 只跑某个 Feature (用 --grep)
npx playwright test tests/intera.spec.ts --grep "绘图工具"
npx playwright test tests/intera.spec.ts --grep "绘图工具|图层管理"

# 综合冒烟 (最快)
npx playwright test tests/intera.spec.ts --grep "综合集成"

# 查看截图
ls tests/screenshots/
```

### BDD Feature 覆盖 (tests/intera.spec.ts)

| Feature | 测试数 | 覆盖内容 |
|---|---|---|
| 应用外壳 | 6 | 四栏布局、工具/操作按钮、空状态引导、零报错 |
| 绘图工具 | 8 | R/O/F/T 四种工具、自动切回、自动选中、连续绘制 |
| 图层管理 | 3 | 面板选中、坐标属性、类型图标 |
| 属性面板 | 6 | X/Y/W/H、宽高值、属性编辑、透明度、颜色、选中切换 |
| 显示状态 | 6 | 默认状态、添加/删除/切换、删除按钮可见性 |
| 画布导航 | 2 | 滚轮放大/缩小 |
| 预览模式 | 4 | 进入/退出、面板隐藏/恢复、零报错 |
| Patch 编辑器 | 1 | 打开/关闭 |
| 键盘快捷键 | 6 | V/R/O/F/T 切换、快速连续切换 |
| 曲线配置 | 2 | 弹簧类型、响应/阻尼 |
| 关键属性 | 1 | 选中后显示列表 |
| 导出 | 1 | 导出对话框 |
| 状态间动画过渡 | 1 | 两状态+属性+切换无报错 |
| 综合集成 | 2 | 端到端工作流 + 10 图层压力测试 |

### 源码 → Feature 映射 (改哪个模块，跑哪个测试)

| 源码模块 | BDD Feature | grep 参数 |
|---|---|---|
| `App.vue` / `Toolbar` / 整体布局 | 应用外壳 | `应用外壳` |
| `useDrawTool.ts` / `DOMRenderer.ts` | 绘图工具 | `绘图工具` |
| `LayerPanel.vue` / `SceneGraph.ts` | 图层管理 | `图层管理` |
| `PropertiesPanel.vue` / `DisplayState.ts` | 属性面板 | `属性面板` |
| `StateBar.vue` / `project.ts` 状态 | 显示状态 | `显示状态` |
| `CanvasViewport.vue` / `canvas.ts` | 画布导航 | `画布导航` |
| `PreviewMode.vue` / `editor.ts` | 预览模式 | `预览模式` |
| `PatchCanvas.vue` / `PatchRuntime.ts` | Patch 编辑器 | `Patch` |
| `useKeyboard.ts` | 键盘快捷键 | `键盘快捷键` |
| `CurvePanel.vue` / `FolmeEase.ts` | 曲线配置 | `曲线配置` |
| `KeyPropertyPanel.vue` | 关键属性 | `关键属性` |
| 导出器 `*Exporter.ts` | 导出 | `导出` |
| `SmartAnimate.ts` / `FolmeManager.ts` | 状态间动画过渡 | `状态间动画` |

### 编写自定义验证脚本

如需临时验证特定功能，在 `tests/` 下创建 `.spec.ts` 文件:

```typescript
import { test, expect } from '@playwright/test'

test('自定义验证', async ({ page }) => {
  await page.goto('http://localhost:5177')
  await page.waitForLoadState('networkidle')

  // 坐标级鼠标操作 (画布交互核心能力)
  const canvas = page.locator('.canvas-area')
  const box = await canvas.boundingBox()
  await page.mouse.move(box!.x + 300, box!.y + 300)
  await page.mouse.down()
  await page.mouse.move(box!.x + 500, box!.y + 500, { steps: 10 })
  await page.mouse.up()

  // 截图
  await page.screenshot({ path: 'tests/screenshots/custom.png' })

  // 控制台错误检测
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  expect(errors).toHaveLength(0)
})
```

### 注意事项

- dev server 端口可能变化 (5173~5177)，从 `pnpm dev` 输出中确认
- 截图保存在 `tests/screenshots/`，验证完可删除
- Playwright 用 headless Chromium，不会弹出浏览器窗口
- 画布操作必须用坐标级 `page.mouse.*`，不能用 element click

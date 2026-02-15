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
8. 【文档同步】全部通过后，更新受影响的文档:
   - docs/KNOWN-ISSUES.md — 必更新 (从待修移到已修)
   - docs/UI-DESIGN.md — 若修复改变了 UI 行为
   - docs/ARCHITECTURE.md — 若修复涉及架构/数据流变更
   - RELAY.md 代码地图 — 若新增/重命名了文件或模块
9. 【Git 提交】git add + commit，格式: fix: 简述修复内容
   代码 + 测试 + 文档一起提交，保持原子性
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
8. 【文档同步】更新受影响的文档 (缺一不可):
   - docs/UI-DESIGN.md — 新增/修改 UI 元素、交互描述
   - docs/ARCHITECTURE.md — 新增模块、数据流变更
   - docs/KNOWN-ISSUES.md — 若解决了已知问题 / 产生新限制
   - RELAY.md 代码地图 — 新增文件、模块入口变更
9. 【Git 提交】git add + commit，格式: feat: 简述新功能
   代码 + 测试 + 文档一起提交，保持原子性
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
7. 【文档同步】更新受影响的文档:
   - docs/ARCHITECTURE.md — 结构/命名/模块边界变更
   - RELAY.md 代码地图 — 文件重命名、目录调整
   - docs/UI-DESIGN.md — 若重构改变了组件接口或交互
8. 【Git 提交】git add + commit，格式: refactor: 简述重构内容
   代码 + 测试 + 文档一起提交，保持原子性
```

### 流程 E: 角色旅程验证 (AI 驱动·逐步探索)

> ⛔ **不要运行** `npx playwright test tests/persona.spec.ts`，那是能力回归，不是旅程。
> ✅ **正确做法**: AI 自己用浏览器工具 (browser_navigate / browser_click / browser_screenshot)
>    像用户一样一步一步操作。每步截图 → 看画面 → 说出决策 → 操作 → 看结果。
>    发现摩擦就修，修完重走，循环至丝滑。

#### 能力图谱 → 画像自动生成

```
能力图谱:
  states ─────┬── curves ──┐
              └── patch ───┴── folme
```

扩展: 在图谱加一个能力 → 新画像自动涌现。

#### 画像 + 设计目标

6 个画像从能力图谱自动枚举:
∅ / {states} / {states,curves} / {states,patch} / {states,curves,patch} / 全能力

**设计目标由 AI 动态生成**，不预置。
AI 拿到能力集后，自己构思一个完整的交互动效设计任务。
- 任务必须覆盖该画像的所有能力，产出是完成的设计作品
- 同一画像可跑不同复杂度 (简单/中等/复杂)
- 多轮验证时变换设计任务，覆盖更多场景

#### 禁止事项

- ⛔ 不要运行 `npx playwright test tests/persona.spec.ts`，那是能力回归
- ⛔ 不要提前规划所有步骤，不要写脚本
- ⛔ 不要在没看截图的情况下执行下一步操作
- ⛔ 不要反复打开关闭浏览器。打开一次，全程保持同一窗口
- ⛔ **不要写多步合并脚本** — 禁止把多个操作写进一个 Playwright/JS 脚本一次性执行再回头看截图。这和「提前规划所有步骤」是完全相同的违规。每次只执行一个动作，看到结果再决定下一步
- ⛔ 不要用 `npx playwright test` 驱动旅程探索。旅程用浏览器工具交互，不是自动化测试框架

#### 工具: journey-server (唯一正确方式)

通过 `tests/journey-server.mjs` 逐步操作浏览器。每次 `curl` = 一个动作 + 一张截图。
浏览器由 server 常驻管理，AI 无法批量执行。

```bash
# 启动 (后台运行)
node tests/journey-server.mjs --dir docs/journeys/{旅程文件夹} --port 3900 &

# 每步一个 curl (返回 {"step":N,"screenshot":"path"})
# 所有操作都是坐标 + 键盘，像真实用户一样看到什么点什么
curl -s localhost:3900/step -d '{"action":"screenshot"}'              # 看屏幕
curl -s localhost:3900/step -d '{"action":"mouse","x":500,"y":300}'   # 点击
curl -s localhost:3900/step -d '{"action":"dblclick","x":100,"y":350}'  # 双击
curl -s localhost:3900/step -d '{"action":"rightclick","x":100,"y":350}'  # 右键
curl -s localhost:3900/step -d '{"action":"hover","x":500,"y":300}'   # 悬停
curl -s localhost:3900/step -d '{"action":"drag","x1":400,"y1":200,"x2":600,"y2":400}'  # 拖拽
curl -s localhost:3900/step -d '{"action":"press","key":"r"}'         # 按键/快捷键
curl -s localhost:3900/step -d '{"action":"keyboard","text":"Hello"}' # 打字
curl -s localhost:3900/step -d '{"action":"scroll","x":900,"y":400,"deltaY":200}'  # 滚动

# 修改输入框值的方式 (不用选择器，像用户一样操作):
#   mouse(x,y) → press("Control+a") → keyboard("360") → press("Enter")
# 使用下拉框的方式:
#   mouse(x,y) → screenshot → mouse(选项坐标)

# 结束
curl -s localhost:3900/step -d '{"action":"save"}'   # 导出 design.intera
curl -s localhost:3900/step -d '{"action":"stop"}'   # 关闭浏览器
```

#### 核心协议: 一次一步，看完再动

```
1. 选画像，构思设计任务，不规划步骤
2. 启动 journey-server (后台，浏览器常驻)
3. 循环 {
     a. curl screenshot → Read 截图文件查看
     b. 描述截图中看到了什么 (具体画面内容)
     c. 基于画面 + 设计任务，决定下一步 (只决定一步)
     d. curl 执行这一步 → Read 截图查看结果
     e. 回到 b
   }
4. 设计任务完成 → 归档旅程 (README.md + design.intera + 截图)
5. 摩擦点同步到 docs/KNOWN-ISSUES.md 摩擦日志   ← ⚠️ 不可跳过
6. git add + git commit 旅程归档   ← ⚠️ 不可跳过
7. 有摩擦 → 修代码 → git commit 代码修改 → 能力回归确认没坏 → 重走旅程
8. 无摩擦 → 标记 ✅ → 下一画像，依然走流程E
```

**操作偏好 (像真实设计师 — 零选择器)**:
- **只有坐标和键盘** — 从截图估算位置，用 `mouse`/`drag`/`dblclick`/`rightclick`/`hover`。选择器已从 server 移除
- **拖拽 > 输入框** — 调整尺寸/位置时优先拖拽手柄
- **改输入框值** — `mouse` 点击输入框 → `press("Control+a")` 全选 → `keyboard("新值")` → `press("Enter")`
- **用下拉框** — `mouse` 点击下拉 → `screenshot` 看选项 → `mouse` 点击选项坐标
- **滚动** — `scroll` 传鼠标位置 (x,y) 和滚动量 (deltaX/deltaY)
- **禁止 eval / 禁止选择器** — server 不提供这些能力，从架构上杜绝

**产品快捷键 (设计师常用)**:
| 按键 | 功能 |
|---|---|
| `v` | 选择工具 |
| `r` | 矩形工具 |
| `o` | 椭圆工具 |
| `f` | Frame 工具 |
| `t` | 文本工具 |
| `Arrow` | 微调选中图层 1px |
| `Shift+Arrow` | 微调选中图层 10px |
| `Delete` / `Backspace` | 删除选中图层 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `Ctrl+S` | 保存 |

**关键**:
- AI 不知道产品操作方式，通过看画面探索
- 设计目标由 AI 自己构思，不是预置脚本
- 产出是一个完成的交互动效设计作品

**铁律 — 不可违反**:
- ⛔ **每个画像质量一致** — 第 6 个画像和第 1 个画像必须一样详细。每一步都必须有截图 + 描述 + 决策。不允许后面的画像草率概括或批量处理
- ⛔ **摩擦点双写** — 每条摩擦点必须同时写入两处: (1) 旅程 README.md 的「摩擦点」区 (2) `docs/KNOWN-ISSUES.md` 的「摩擦日志」表。只写一处 = 没写
- ⛔ **摩擦点必须修复** — 发现摩擦不是记笔记。旅程结束后必须: 记录到 README + KNOWN-ISSUES → 修代码 → git commit 修复 → 跑能力回归 → 重走旅程验证修复生效。摩擦未修复的旅程结论只能是「有摩擦待修」，不能标 ✅
- ⛔ **摩擦修复循环** — 旅程发现摩擦 → 修代码 → commit → 回归测试 → 用同一画像重走旅程。循环直到该画像零摩擦才能标 ✅ 进入下一画像
- ⛔ **代码·测试·文档三位一体** — 任何功能修改/新增/修复，必须同时更新: (1) 代码 (2) BDD 测试 (`tests/intera.spec.ts`) (3) 相关文档 (`UI-DESIGN.md`/`ARCHITECTURE.md`/`KNOWN-ISSUES.md`/`RELAY.md` 代码地图)。三者必须在同一次 commit 中完成。缺任何一项 = 未完成

#### 旅程归档

每次旅程完成后，追加一份归档。每次新建文件，不覆盖。

文件结构:
```
docs/journeys/{YYYYMMDD_HHmm}-{画像id}-{简述}/
  README.md          ← 旅程记录 (过程 + 结论)
  design.intera      ← 最终设计文件
  screenshots/
    step-01.png
    step-02.png
    ...
```

README.md 内容:
- **画像**: 能力集
- **设计目标**: AI 构思的设计任务
- **过程**: 每步的截图路径 + 看到了什么 + 决策 + 结果
- **摩擦点**: 遇到的困难和改进建议 (同步到 `docs/KNOWN-ISSUES.md` 摩擦日志)
- **结论**: 通过 / 有摩擦待修

设计文件获取: 旅程结束时通过浏览器控制台读取 `localStorage.getItem('intera_project')` 保存为 `design.intera`

#### ⚠️ 所有修改必须提交 git

**旅程归档**完成后，立即提交:
```bash
git add docs/journeys/{旅程文件夹}/
git commit -m "journey: {画像id} — {设计目标简述}"
```

**修代码**后，也必须立即提交:
```bash
git add -A
git commit -m "fix: {修复了什么摩擦点}"
```

不提交 = 不存在。旅程归档和代码修复都不可跳过 git commit。

#### 两层验证体系

| | 旅程探索 (Flow E) | 能力回归 (persona.spec.ts) |
|--|--|--|
| **执行者** | AI 看截图逐步操作 | Playwright 自动跑 |
| **决策者** | AI (每步看画面决定) | 代码 (确定性序列) |
| **验证什么** | 体验是否丝滑 | 功能是否完好 |
| **何时跑** | 打磨体验时 | 修完代码后回归 |

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
| **场景** | `scene/types.ts` | 类型 barrel (re-export SceneTypes + PatchTypes) |
| | `scene/SceneTypes.ts` | 图层/状态/曲线类型定义 |
| | `scene/PatchTypes.ts` | Patch 节点 discriminated union 类型 |
| | `scene/SceneGraph.ts` | 图层树 CRUD |
| | `scene/DisplayState.ts` | 显示状态 + override 管理 |
| | `scene/SmartAnimate.ts` | 状态差异 → folme.to() 调用 |
| **交互** | `state/VariableManager.ts` | 逻辑变量 get/set/toggle |
| | `state/PatchRuntime.ts` | Patch 图执行引擎 (Map 索引 + 定时器管理) |
| | `state/PatchDefs.ts` | Patch 节点端口定义 + 工厂 |
| | `state/BehaviorManager.ts` | Behavior 节点生命周期 (create/destroy) |
| | `state/SugarPresets.ts` | 一键预设 |
| **基础** | `idFactory.ts` | 统一 ID 生成工厂 |
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
|| | `PatchVarPanel.vue` | 变量管理面板 (增删改名/类型/默认值，可折叠) |

### Store 层 (`src/store/`)

| 文件 | 职责 |
|---|---|
| `project.ts` | 项目数据中枢 (图层/状态/动画/撤销/持久化) |
| `editor.ts` | 工具选择 + Patch 面板开关 |
| `canvas.ts` | 视口 (zoom/pan) + 选区 |
| `patch.ts` | Patch 编辑器状态 (变量 add/remove/update + Patch CRUD + 运行时) |

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

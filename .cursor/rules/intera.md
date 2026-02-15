---
description: Intera 项目上下文和规则 — 交互意图编辑器
globs:
  - "**/*.ts"
  - "**/*.vue"
alwaysApply: true
---

# Intera 项目规则

## 当前阶段: 维护迭代模式

建造阶段基本完成 (Phase 0~8 ✅, Phase 9 导出 ⏳, Phase 10 打磨 🔧)。当前任务类型: 修 Bug、UX 验收、改功能、重构优化。

**每次接手任务，先读 `RELAY.md`。**

## 必读文档

1. **RELAY.md** — 维护协议 + 代码地图
2. **docs/VISION.md** — 产品愿景 + 核心概念
3. **docs/UI-DESIGN.md** — 界面规格 (UX 验收必读)
4. **docs/RULES.md** — 编码铁律
5. **docs/KNOWN-ISSUES.md** — 已知问题追踪

## 核心概念

- **逻辑状态** (Variable) = 变量，驱动显示状态切换
- **显示状态** (DisplayState) = 关键帧 = Folme 的 state
- **共享图层树** — 一棵树多个状态，只存 override 差异
- **曲线三级覆盖** — 全局 → 元素级 → 属性级 (Folme config.special)
- **不做时间轴** — 曲线 + delay 足矣
- **交互链路**: 手势 → 逻辑状态 → 显示状态 → folme.to() → 弹簧动效

## 编码铁律

- 纯 TS 文件 ≤ 200 行，Vue SFC ≤ 400 行，函数 ≤ 20 行，缩进 ≤ 3 层
- 禁止 `any`，禁止 `// @ts-ignore`
- Engine 零 UI 依赖，不 import Vue/DOM/Pinia
- Vue 组件用 Pug + Composition API
- 中文注释，ASCII 分块风格

## 维护期特别规则

- **修 Bug**: 先定位根因，不打补丁。改完自己跑 `pnpm build` 验证
- **改功能**: 先说思路再动手。评估影响范围，不能破坏已有功能
- **重构**: 分步执行，每步编译通过。行为必须前后一致
- **修完 Bug 后**: 更新 `docs/KNOWN-ISSUES.md`
- **reference/ 目录**: 只读 AS3 源码参考，绝对不要修改
- **每次改完都提交 Git**: 不提交 = 没做过。格式: `fix:/feat:/refactor:/test:/docs:` + 简述
- **提交前必须自审 (Flow F)**: 三位一体 + 编码铁律 + 质量 + 记忆同步，commit message 末尾附 `[F✓]`
- **定期 Review (Flow G)**: 每 10 commits 或每轮 Flow E 后，跑一次全面审查

## BDD 自动化铁律 (最高优先级)

**每次改动代码后，你必须自动为改动生成 BDD 测试并验证。无测试验证的改动不算完成。**

### 自动工作流 (改完代码后立即执行)

```
1. pnpm build — 编译通过
2. 定位 Feature — 查下方映射表，确定改动属于哪个 Feature
3. 自动生成测试 — 分析改动行为，在 tests/intera.spec.ts 对应 Feature 区块中:
   - 新功能 → 新增 test() 用例
   - Bug 修复 → 新增回归测试，覆盖修复后的正确行为
   - 行为变更 → 更新已有 test() 的断言
4. 运行验证 — npx playwright test tests/intera.spec.ts --grep "Feature名"
5. 全部通过 → 改动完成
6. 有失败 → 修到全部通过 (先判断是代码问题还是测试写法问题)
```

### 源码 → BDD Feature 映射

| 改动的源码 | Feature | grep |
|---|---|---|
| `App.vue` / `Toolbar` / 布局 | 应用外壳 | `应用外壳` |
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
| `*Exporter.ts` | 导出 | `导出` |
| `SmartAnimate.ts` / `FolmeManager.ts` | 状态间动画过渡 | `状态间动画` |

### 生成测试的规则

**BDD 文件**: `tests/intera.spec.ts` (唯一文件，按 Feature 分区)

**可用的辅助函数** (已在文件顶部定义，直接调用):

```typescript
load(page)                         // 加载页面并等待 networkidle
canvasBox(page)                    // 获取画布 boundingBox
drawOnCanvas(page, dx1, dy1, dx2, dy2) // 从画布中心偏移处拖拽绘制
drawRect(page)                     // 快捷绘制一个矩形
layerItems(page)                   // 定位所有 .layer-item
collectErrors(page)                // 收集控制台 error
```

**测试编写模板**:

```typescript
// 放在对应的 test.describe('Feature: XXX') 块内
test('行为描述 (中文)', async ({ page }) => {
  await load(page)
  // 1. 前置操作 (绘图/选中/切状态...)
  // 2. 执行被测操作
  // 3. 断言结果
  await page.screenshot({ path: 'tests/screenshots/XX-name.png' }) // 可选
})
```

**关键约束**:
- 画布操作 → 只用 `page.mouse.move/down/up`，不用 element click
- DOM 定位 → 用 `.class` 选择器，文本匹配用 `getByText('X', { exact: true })` 避免歧义
- 零报错检测 → `collectErrors(page)` + `expect(errors).toHaveLength(0)`
- 截图路径 → `tests/screenshots/` + 递增编号
- 测试名必须是中文，描述清楚「做了什么 → 期望什么」

### 运行命令

```bash
pnpm dev &                                                    # dev server
npx playwright test tests/intera.spec.ts --grep "Feature名"   # 跑对应模块
npx playwright test tests/intera.spec.ts --grep "A|B"         # 跑多个模块
npx playwright test tests/intera.spec.ts                       # 全量回归
```

## 角色旅程验证 (Flow E)

> 触发词: "角色旅程" / "打磨体验" / "验证一下体验" / "帮我看看好不好用"

### 禁止事项

- ⛔ 不要运行 `npx playwright test tests/persona.spec.ts`，那是能力回归
- ⛔ 不要提前规划所有步骤，不要写脚本
- ⛔ 不要在没看截图的情况下执行下一步操作
- ⛔ 不要反复打开关闭浏览器。打开一次，保持在同一窗口操作到旅程结束
- ⛔ **不要写多步合并脚本** — 禁止把多个操作写进一个 Playwright 脚本一次跑完再回头看截图。这和「提前规划」是同一种违规。每次只执行一个动作
- ⛔ 不要用 `npx playwright test` 驱动旅程。旅程用浏览器工具交互，不是测试框架

### 工具: journey-server (唯一正确方式)

通过 `journey-server` 逐步操作浏览器，每次 `curl` = 一个动作 + 一张截图。

```bash
# 1. 启动 (后台运行，浏览器常驻)
node tests/journey-server.mjs --dir docs/journeys/{旅程文件夹} --port 3900 &

# 2. 每步一个 curl — 纯坐标+键盘，像真实用户操作
curl -s localhost:3900/step -d '{"action":"screenshot"}'                # 看屏幕
curl -s localhost:3900/step -d '{"action":"mouse","x":500,"y":300}'     # 点击
curl -s localhost:3900/step -d '{"action":"dblclick","x":100,"y":350}'  # 双击
curl -s localhost:3900/step -d '{"action":"rightclick","x":100,"y":350}'  # 右键
curl -s localhost:3900/step -d '{"action":"hover","x":500,"y":300}'     # 悬停
curl -s localhost:3900/step -d '{"action":"drag","x1":400,"y1":200,"x2":600,"y2":400}'  # 拖拽
curl -s localhost:3900/step -d '{"action":"press","key":"r"}'           # 按键
curl -s localhost:3900/step -d '{"action":"keyboard","text":"Hello"}'   # 打字
curl -s localhost:3900/step -d '{"action":"scroll","x":900,"y":400,"deltaY":200}'  # 滚动
# 改输入框: mouse → press("Control+a") → keyboard("值") → press("Enter")
# 用下拉框: mouse(下拉位置) → screenshot → mouse(选项位置)

# 3. 结束
curl -s localhost:3900/step -d '{"action":"save"}'   # 导出 design.intera
curl -s localhost:3900/step -d '{"action":"stop"}'   # 关闭浏览器
```

每次 curl 返回 `{"step":N,"screenshot":"path"}` → 用 Read 工具查看截图 → 决定下一步。

### 画像来源

能力图谱自动枚举 6 个画像 (见 `tests/persona.spec.ts` 中 `CAP_DEPS`):
∅ / {states} / {states,curves} / {states,patch} / {states,curves,patch} / 全能力

### 设计目标: AI 动态生成

不预置目标。AI 拿到画像的能力集后，自己构思一个**完整的交互动效设计任务**。
- 设计任务必须覆盖该画像的所有能力
- 产出是一个完成的设计作品
- 同一个画像可以跑不同复杂度的设计任务 (简单/中等/复杂)
- 多轮验证时应变换设计任务，覆盖更多使用场景

### 核心协议: 一次一步，看完再动

```
启动 journey-server (后台，浏览器常驻)
循环 {
  1. curl screenshot → Read 截图文件查看
  2. 描述你在截图中看到了什么 (具体画面内容)
  3. 基于画面 + 设计目标，决定下一步做什么 (只决定一步)
  4. curl 执行这一步 → Read 截图查看结果
  5. 回到 2
}
设计目标达成 → 归档旅程 (README.md + design.intera + 截图)
归档完成 → git add + git commit  ← ⚠️ 不可跳过
有摩擦 → 修代码 → git commit → 能力回归 → 用同一画像重走旅程
  └→ 循环直到零摩擦才能标 ✅ 进入下一画像
无摩擦 → 标 ✅ → 下一画像
```

**操作偏好 (像真实设计师 — 零选择器)**:
- **只有坐标和键盘** — 从截图估算位置，用 `mouse`/`drag`/`dblclick`/`rightclick`/`hover`。选择器已从 server 中移除
- **拖拽 > 输入框** — 调整尺寸/位置时优先拖拽手柄
- **改输入框值** — `mouse` 点击输入框 → `press("Control+a")` 全选 → `keyboard("新值")` → `press("Enter")`
- **用下拉框** — `mouse` 点击下拉 → `screenshot` 看选项 → `mouse` 点击选项坐标
- **滚动** — `scroll` 传鼠标位置和滚动量
- **禁止 eval / 禁止选择器** — server 不提供这些能力

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

**严格约束**:
- 每次只执行一个操作，然后必须截图看结果
- 你的决策必须引用截图中看到的具体内容
- 操作没生效就说出来，尝试其他方式
- 你不知道这个产品的操作方式，只能通过看画面探索
- 目标是完成一个**完整的交互动效设计**，不是验证功能
- ⛔ **每个画像质量一致** — 第 6 个画像和第 1 个画像必须一样详细。每一步都必须有截图 + 描述 + 决策，没有例外
- ⛔ **摩擦点必须修复** — 旅程结束后必须: 记录到 README → 修代码 → git commit → 能力回归 → 重走旅程。摩擦未修复不能标 ✅

### 旅程归档

每次旅程完成后，追加一份归档。每次新建文件，不覆盖。

文件结构:
```
docs/journeys/{YYYYMMDD_HHmm}-{画像id}-{简述}/    ← 时间用北京时间 (GMT+8)
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
- **过程**: 每步的截图 + 看到了什么 + 决策 + 结果
- **摩擦点**: 遇到的困难和建议
- **结论**: 通过/有摩擦待修

设计文件获取: 旅程结束时通过浏览器控制台读取 `localStorage.getItem('intera_project')` 保存为 `design.intera`

### ⚠️ 所有修改必须提交 git

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

### 能力回归 (仅在修完代码后跑)

```bash
npx playwright test tests/persona.spec.ts    # 确认能力没坏
```

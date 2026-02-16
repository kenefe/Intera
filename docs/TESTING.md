# Intera — 测试指南

> 跑测试时读这个文件。BDD 覆盖表 + Playwright 命令 + 编写规范。

---

## 快速命令

```bash
# 确保 dev server 在跑
pnpm dev &

# 全量 BDD 测试
npx playwright test tests/intera.spec.ts --reporter=list

# 只跑某个 Feature (用 --grep)
npx playwright test tests/intera.spec.ts --grep "绘图工具"
npx playwright test tests/intera.spec.ts --grep "绘图工具|图层管理"

# 综合冒烟 (最快)
npx playwright test tests/intera.spec.ts --grep "综合集成"

# 能力回归 (修完代码后跑)
npx playwright test tests/persona.spec.ts

# 结构测试 (Flow G / CI 时跑)
npx playwright test tests/structure.spec.ts

# 查看截图
ls tests/screenshots/
```

---

## BDD Feature 覆盖 (tests/intera.spec.ts)

| Feature | 测试数 | 覆盖内容 |
|---|---|---|
| 应用外壳 | 6 | 四栏布局、工具/操作按钮、空状态引导、零报错 |
| 绘图工具 | 8 | R/O/F/T 四种工具、自动切回、自动选中、连续绘制 |
| 图层管理 | 3 | 面板选中、坐标属性、类型图标 |
| 属性面板 | 6 | X/Y/W/H、宽高值、属性编辑、透明度、颜色、选中切换 |
| 显示状态 | 6 | 默认状态、添加/删除/切换、删除按钮可见性 |
| 画布导航 | 2 | 滚轮放大/缩小 |
| 预览面板 | 4 | 常驻可见、图层渲染、交互零报错、Level 0 自动循环 |
| Patch 编辑器 | 4 | 常驻可见、节点工具栏、变量新建/删除、面板折叠 |
| 键盘快捷键 | 6 | V/R/O/F/T 切换、快速连续切换 |
| 曲线配置 | 2 | 弹簧类型、响应/阻尼 |
| 关键属性 | 1 | 选中后显示列表 |
| 导出 | 1 | 导出对话框 |
| 状态间动画过渡 | 1 | 两状态+属性+切换无报错 |
| 综合集成 | 3 | 端到端工作流 + 10 图层压力测试 + 保存恢复 |
| Drag 行为 | 1 | behaviorDrag 绑定图层后拖拽跟手 |
| UI 打磨回归 | 7 | 状态栏/工具栏激活态、描边默认值、Patch滚动、曲线精确输入、data-testid、spinner隐藏 |
| Review #1 补缺 | 5 | 状态命名格式、Patch节点删除、端口拖线连接、变量就地创建、input内快捷键屏蔽 |
| 摩擦点修复回归 | 5 | ColorPicker替换原生color、hex输入+色板弹出、折叠分组存在+默认态、折叠展开交互、Shift连续绘制 |

---

## 源码 → Feature 映射 (改哪个模块，跑哪个测试)

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
| `StateBar.vue` / `PropertiesPanel.vue` / `CurveEdit.vue` / `PatchCanvas.vue` 样式变更 | UI 打磨回归 | `UI 打磨回归` |
| `ColorPicker.vue` / `CollapsibleGroup.vue` / `useDrawTool.ts` / `useLayerInteraction.ts` | 摩擦点修复回归 | `摩擦点修复回归` |

---

## 编写自定义验证脚本

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

---

## 注意事项

- dev server 端口可能变化 (5173~5177)，从 `pnpm dev` 输出中确认
- 截图保存在 `tests/screenshots/`，验证完可删除
- Playwright 用 headless Chromium，不会弹出浏览器窗口
- 画布操作必须用坐标级 `page.mouse.*`，不能用 element click

# Intera — 编码铁律

> 这些规则没有例外。任何 AI 在编写 Intera 代码时必须严格遵守。
> 违反任何一条即为不合格交付。

---

## 一、文件规模

### 行数分级限制

| 文件类型 | 匹配规则 | 上限 | 理由 |
|----------|----------|------|------|
| 逻辑 TS (默认) | `src/**/*.ts` | **≤ 200 行** | 逻辑文件的核心复杂度控制 |
| 声明 TS | `*Types.ts` / `types.ts` / `*Defs.ts` / `*Presets.ts` | **≤ 300 行** | 纯声明低认知负荷 |
| 工具 TS | `utils/*.ts` | **≤ 100 行** | 超了就是做了两件事 |
| Vue SFC | `*.vue` | **≤ 400 行** | 模板 + 脚本 + 样式 |
| 测试 / CSS | `*.spec.ts` / `*.css` | 不限 | 天然冗长或纯声明 |

### 其他指标

| 指标 | 上限 | 建议值 |
|------|------|--------|
| 单函数行数 | **≤ 20 行** | 5-15 行 |
| 单文件导出数 | **≤ 5 个** | 1-3 个 |
| 缩进深度 | **≤ 3 层** | 1-2 层 |
| Vue template | **≤ 80 行 Pug** | 40-60 行 |
| Vue script | **≤ 150 行** | 60-100 行 |

**触碰红线 → 立即拆分，没有例外。**

声明是目录，逻辑是叙事，工具函数是单词。目录可以长，叙事必须短，单词不应长。

---

## 二、命名规范

```
文件名:     PascalCase.ts (类/组件)  camelCase.ts (工具函数)
类名:       PascalCase              class SpringForce
接口名:     PascalCase              interface LayerProps
类型名:     PascalCase              type CurveType
函数名:     camelCase               function createLayer()
变量名:     camelCase               const layerCount
常量名:     UPPER_SNAKE             const MAX_LAYERS
Vue组件:    PascalCase.vue          CanvasLayer.vue
Store:      camelCase.ts            project.ts
```

---

## 三、架构规则

### 层间依赖 (严禁违反)

```
UI 层 (Vue)     →  可以引用  →  Store, Renderer 接口, Engine 类型
Store (Pinia)   →  可以引用  →  Engine 类型
Engine (纯 TS)  →  不能引用  →  Vue, Pinia, DOM API, 任何 UI 相关
Renderer        →  只实现    →  Renderer 接口，被 UI 层消费
```

### 引擎层零 UI 依赖

`src/engine/` 下的所有文件：
- ❌ 不能 import Vue
- ❌ 不能 import Pinia
- ❌ 不能访问 document / window / DOM API
- ❌ 不能引用 `src/components/` 或 `src/store/` 下的任何东西
- ✅ 只能引用 `src/engine/` 内部的模块

### Store 拆分原则

每个 Store 文件对应一个职责域：
- `project.ts` — 项目数据 (图层树、显示状态、Patch)
- `canvas.ts` — 画布视口 (zoom, pan, 选中图层)
- `editor.ts` — 编辑器状态 (当前工具、编辑模式)

**绝不允许出现 God Store。** 如果一个 Store 超过 200 行，必须拆分。

---

## 四、Vue 组件规范

### 模板

- 使用 **Pug** 模板语法
- 使用 **Composition API** (`<script setup lang="ts">`)

### 组件拆分

- 单个 `.vue` 文件的 `<template>` 部分不超过 **50 行 Pug**
- 单个 `.vue` 文件的 `<script>` 部分不超过 **100 行**
- 超过 → 抽取子组件或 composable

### Props / Emits

- 必须显式声明类型：`defineProps<{ zoom: number }>()`
- 不使用 `any`

---

## 五、注释规范

使用中文注释，ASCII 分块风格：

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  模块名 —— 模块简述
//  职责说明
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 小节标题 ──

/** 函数/类的 JSDoc 注释用英文或中文皆可，简洁为主 */
```

---

## 六、禁止事项

1. ❌ **禁止 `any` 类型** — 必须给出具体类型
2. ❌ **禁止 God Object** — 单个类/Store 不超过 200 行
3. ❌ **禁止循环依赖** — A 引用 B 且 B 引用 A 是架构错误
4. ❌ **禁止魔法数字** — 所有阈值/常量必须命名
5. ❌ **禁止 console.log** — 调试完成后必须删除
6. ❌ **禁止跳过类型检查** — 不使用 `@ts-ignore` 或 `as any`
7. ❌ **禁止在引擎层引用 UI** — engine/ 是纯逻辑岛
8. ❌ **禁止一次性生成大文件** — 每个文件逐个创建和验证

---

## 七、Git 规范

```
feat: 新功能
fix:  Bug 修复
refactor: 重构 (不改变行为)
docs: 文档更新
style: 格式调整 (不影响逻辑)
chore: 构建/工具变更
```

每个 Phase 完成时创建一个 tag: `v0.1-phase1`, `v0.1-phase2` ...

---

## 八、自检清单

每次提交代码前，AI 必须自问：

- [ ] 有没有文件超过 200 行？
- [ ] 有没有函数超过 20 行？
- [ ] 有没有缩进超过 3 层？
- [ ] 有没有使用 any？
- [ ] 引擎层有没有引用 UI？
- [ ] Store 有没有变成 God Store？
- [ ] 有没有特殊情况可以被消除（用更好的数据结构）？
- [ ] 有没有最丑陋的一行可以优化？

---

## 九、代码卫生 (AI 生产质量)

### 提取 > 复制

- 发现 2+ 处相同逻辑 → **立即提取**为共享模块，不允许"先复制后整理"
- 工具函数 → `utils/`
- 共享样式 → 同级 CSS 文件
- 共享类型 → 就近 `types.ts`

### 目录职责

```
tests/       只放 .spec.ts 测试文件 + screenshots/ + journey-server.mjs + persona.spec.ts
scripts/     调试/演示脚本 (不在 tests/ 里)
docs/        文档 + 旅程归档
reference/   AS3 源码参考 (只读)
```

- 不允许临时文件残留 (`repro-*`, `debug-*`, `temp-*`)
- 演示脚本属于 `scripts/`，不是 `tests/`

### DRY 扫描 (每次 commit 前)

- 在 `git diff` 中搜索重复模式
- 同一函数出现在 2+ 文件 → 提取到共享模块
- 同一 CSS 规则出现在 2+ 组件 → 提取到共享 CSS 文件
- 同一类型定义出现在 2+ 文件 → 提取到就近 types.ts

# Intera — 工作记忆 (Scratchpad)

> **给 AI 的指令：复杂任务的中间状态写在这里，跨会话持久化。**
> 每次新对话开始时，读完 `RELAY.md` 后也读一下这个文件，了解上次做到哪了。
> 任务完成后清空对应段落，保持文件简洁。

---

## 当前任务

**UI Design Token 体系建立 — 收尾阶段**

已完成：
- `src/styles/tokens.css` — CSS 自定义属性（4层 surface / 4级文字 / 3级边框 / Indigo 主色 / 排版 / 间距 / 圆角）
- `src/styles/base.css` — 全局重置 + 滚动条 + 选区
- `main.ts` 引入全局样式
- 22+ 组件全部迁移至 token 体系（App / 6 面板 / 4 Canvas / 3 Patch / 3 辅助 / 4 属性组 / 2 共享 CSS）
- Vite build 通过，浏览器 HMR 验证通过

待完成：
- [ ] 浏览器截图对照 UI-DESIGN.md 布局规格验证
- [ ] BDD 测试
- [ ] 文档同步（UI-DESIGN.md）
- [ ] Git commit（feat: + [F✓]）

## 架构决策备忘

**Design Token 采用 CSS 自定义属性而非 JS 变量**
- 原因：零运行时开销，所有组件通过 CSS 继承自动生效
- 原因：未来可支持主题切换（light/dark）只需切换 :root 变量
- 原因：避免 JS↔CSS 数据同步的复杂性

**保留 LayerIcon.vue 的语义色硬编码**
- 原因：图层类型色（frame=#818cf8, rect=#f472b6 等）是功能语义色，不属于全局 token

## 待验证项

- [ ] 面板尺寸是否符合 UI-DESIGN.md 规格（左 230px / 右 280px / Toolbar 40px）
- [ ] 预存 TS 错误 usePreviewGesture.ts:75 — activeDisplayStateId 可能为 null

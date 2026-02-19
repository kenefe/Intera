# Growth Log — Component Reuse

## 2026-02-19: F200-F207 组件复用

### 做了什么
- 完整的 master/instance 组件系统
- 8 个 feature 一轮完成（数据→引擎→store→UI→patch→同步→嵌套）
- 3 BDD 测试通过，build 零错误

### 关键决策
- instance 不存子树，渲染时从 master 实时读取 → 天然支持 master 编辑同步
- Patch 克隆在 rebuild 时注入，不改 PatchRuntime 核心逻辑
- 循环检测用 DFS，depth 限制 10 层

### 教训
- Playwright e2e 在资源紧张时会被 SIGKILL，用 `-g` 过滤跑子集更稳
- Vue scoped SVG 的 class 在 Playwright snapshot 里显示为 `img`，测试选择器要用文本内容而非 CSS class
- store 文件 200 行限制很紧，composable 拆分是必须的

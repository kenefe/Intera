# Review #1 — 2026-02-15

审查范围: a47c82f..6bf20b6 (76 commits, 其中 37 个含代码变更)

## 三位一体合规

| Commit | 描述 | 代码 | 测试 | 文档 | 判定 |
|--------|------|------|------|------|------|
| a47c82f | 初始版本 | ✅ | — | ✅ | ✅ 初始提交豁免 |
| 6f1d277 | 选中控制框+椭圆 | ✅ | ❌ | ❌ | 违规 |
| 484bbf6 | 画布交互+多选拖拽 | ✅ | ❌ | ❌ | 违规 |
| 8a79be6 | 属性面板+状态过渡 | ✅ | ❌ | ❌ | 违规 (后续已覆盖) |
| 63236da | setTo+BDD 49/49 | ✅ | ✅ | ✅ | ✅ |
| 6382158 | Patch工具栏可见性 | ✅ | ❌ | ❌ | 违规 (后续已覆盖) |
| b73fd47 | UX视觉增强 | ✅ | ❌ | ✅ | 违规 |
| 44cd7e5 | Patch选中/删除/连线 | ✅ | ❌ | ✅ | 违规 |
| 62a23e3 | 属性面板三重增强 | ✅ | ✅ | ✅ | ✅ |
| b150b57 | E2E+StateBar | ✅ | — | ✅ | ✅ |
| c98b28c | Flow E重构 | ✅ | ✅ | ✅ | ✅ |
| d84c777 | 默认状态不可删 | ✅ | ✅ | ✅ | ✅ |
| 3fffb62 | 状态命名递增 | ✅ | ❌ | ❌ | 违规 |
| 64cd8e1 | 绘制坐标+快捷键 | ✅ | ❌ | ✅ | 违规 |
| 92f5148 | 零基础体验优化 | ✅ | ❌ | ❌ | 违规 |
| e390b1d | SelectionOverlay透传 | ✅ | ❌ | ✅ | 违规 |
| 3926fe1 | 体验打磨+图标重构 | ✅ | ✅ | ❌ | 违规 |
| dc42759 | 变量就地创建 | ✅ | ❌ | ❌ | 违规 |
| a2aeebd | 变量管理面板 | ✅ | ✅ | ✅ | ✅ |
| 34eccd3 | journey-server零选择器 | ✅ | ✅ | ✅ | ✅ |
| 0be1438 | 绘制坐标映射 | ✅ | ❌ | ❌ | 违规 |
| 98fefdc | journey-server增强 | ✅ | — | ❌ | 违规 (工具类) |
| ca6a81f | discriminated union | ✅ | ❌ | ❌ | 违规 |
| 1230b23 | Behavior节点 | ✅ | ❌ | ✅ | 违规 |
| 551a191 | findPort+保存恢复 | ✅ | ✅ | ❌ | 违规 |
| ed9c0e7 | DragEngine连接 | ✅ | ❌ | ❌ | 违规 → e8c5ed8 补文档 |
| 9f95cff | Drag跟手 | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| d648cf5 | PatchDefs defaultConfig | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| aa5d39e | 状态栏+spinner | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| 9294790 | Patch画布高度 | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| 0a20968 | Ctrl+O | ✅ | ❌ | ✅ | 违规 → e3ff6a5 补测试 |
| 8a7bae8 | 曲线精确输入 | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| 6f7e5a4 | 描边默认+工具激活 | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| 515141f | 曲线data-testid | ✅ | ❌ | ❌ | 违规 → e3ff6a5 补测试 |
| bbd6f2f | persona测试适配 | — | ✅ | ❌ | 违规 |
| e3ff6a5 | 补齐UI打磨BDD | — | ✅ | ✅ | ✅ 修复commit |

**统计**: 合规 8/37 (22%), 违规 29/37 (78%), 其中 8 个已被后续 commit 补齐

## 文档一致性

- RELAY.md 代码地图: ❌ 缺 2 文件 (folme/index.ts, main.ts) → 本次修复
- BDD 覆盖表: ❌ 记录 61 项 vs 实际 61 项 → ✅ 一致
- PHASES.md: ✅ Phase 0-8 done, 9 pending, 10 polishing
- RULES.md 行数:
  - 纯 TS: ✅ 全部 ≤200 行
  - Vue SFC >400: ❌ PropertiesPanel.vue (558), PatchNode.vue (441)
  - Vue SFC 200-400: ⚠️ 8 个文件 (合规但需关注)

## BDD 回归

- 61/61 通过 ✅

## 真正缺测试覆盖的功能 (需补)

1. 状态名格式 — 新增状态命名为"状态 2"而非时间戳
2. Patch 节点删除 — 选中节点后可删除
3. Patch 连线 — 从输出端口拖到输入端口创建连线
4. 变量就地创建 — Patch 节点内 '+' 按钮创建变量
5. 文本 input 内快捷键屏蔽 — 聚焦 input 时不触发工具切换

## 需拆分的文件

1. PropertiesPanel.vue (558 行) → 拆分为子组件
2. PatchNode.vue (441 行) → 拆分为子组件

## 修复计划

1. [x] 补全 RELAY.md 代码地图 (folme/index.ts, main.ts, App.vue)
2. [x] 补 5 个缺失的 BDD 测试 → 66/66 全部通过
3. [x] 拆分 PropertiesPanel.vue (558→337 行) → PropTextGroup + PropLayoutGroup + PropAppearanceGroup
4. [x] 拆分 PatchNode.vue (441→370 行) → patch-config.css 提取

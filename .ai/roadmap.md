# F200-F207 Component Reuse — Roadmap

## Phase 1: 数据层 [DONE]
- [x] F200: SceneTypes 加 ComponentDef + LayerType 'instance' + Layer 扩展
- [x] F200: Project 加 components[] + types.ts barrel 导出

## Phase 2: 引擎层 [DONE]
- [x] F201: ComponentResolver 递归解析 + wouldCycle 循环检测
- [x] F205: clonePatches instance Patch 子图克隆 + layerId 重映射

## Phase 3: Store 层 [DONE]
- [x] F202: useComponentActions composable (create/instance/override/detach)
- [x] F202: project store 接入 + restore 支持 components
- [x] F205: patch store rebuild 注入克隆 patch

## Phase 4: UI 层 [DONE]
- [x] F203: Artboard 渲染 instance (resolveInstance → master 子树)
- [x] F204: LayerIcon 菱形图标 + CanvasViewport 右键创建组件
- [x] F206: master 编辑同步 (deep watch 天然支持)
- [x] F207: 嵌套 instance 递归渲染 + 循环检测

## Phase 5: 质量 [DONE]
- [x] BDD 测试 3 条 (右键创建 / 面板正常 / 图标区分)
- [x] docs/CODE-MAP.md + ARCHITECTURE.md 更新

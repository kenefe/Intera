# Component Reuse — WHY

## 问题
资深动效设计师的项目里充满重复结构：列表项、卡片、按钮、Tab。
当前 Intera 的 StateGroup 只是"状态组件"——每个独立存在，无法复用。
做了一个带交互的卡片，想用 5 次就要手动重建 5 次状态 + Patch 逻辑。

## 目标
Component = 图层子树 + StateGroup + Patch 子图 的封装。
Instance = 引用 master，共享结构和逻辑，可 override 内容属性。
改 master → 所有 instance 同步更新。

## 核心决策
1. **嵌套**: master 里可以放其他组件的 instance（禁止自引用递归）
2. **LayerType 扩展**: 新增 `'instance'` 类型，不存子树，渲染时从 master 读取
3. **Patch 克隆**: 每个 instance 运行时克隆 master 的 Patch 图，作用域绑定到 instance 图层
4. **Override 范围 (MVP)**: 只开放内容属性（text, fill, imageSrc, opacity），不改结构
5. **状态继承**: instance 继承 master 全部状态，不能增删
6. **创建交互**: 选中 Frame → 右键 → "创建组件" → 原地变 master

## 不做（MVP）
- ❌ Instance 不能改结构（加删图层）
- ❌ Instance 不能改 Patch 逻辑
- ❌ Instance 不能增删状态
- ❌ 不做组件库/跨项目复用（后续版本）

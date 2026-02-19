# Component Reuse — TASTE

## 参照物

- **Figma**: 组件面板 ◇ 菱形标识 instance，双击进入 master 编辑，属性面板显示 override 差异（紫色点）
- **Framer**: 组件 instance 拖入画布后，右侧面板只暴露 exposed props，其余灰掉
- **ProtoPie**: 组件内交互独立运行，多个 instance 互不干扰

## 可量化验收标准

1. 图层面板：instance 用 ◇ 菱形图标 + 粉色，一眼区分
2. 右键 Frame → "创建组件" ≤ 2 步完成
3. 改 master 属性 → 所有 instance 画布上实时同步（无需手动刷新）
4. 嵌套 instance：master A 内放 B 的 instance，渲染正确，无死循环
5. Preview 时每个 instance 的 Patch 逻辑独立运行
6. 循环引用（A 包含 A）被拒绝，不崩溃

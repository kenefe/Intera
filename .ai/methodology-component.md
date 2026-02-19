# Component Reuse — HOW

## 技术方案

### 数据模型

**SceneTypes 新增：**

```typescript
// 组件定义 (master)
interface ComponentDef {
  id: string
  name: string
  rootLayerId: string        // master 图层子树根 (Frame)
  stateGroupId: string       // 关联的 StateGroup
  patchIds: string[]         // 关联的 Patch 节点 ID
  exposedProps: Record<string, (keyof AnimatableProps | 'text' | 'imageSrc')[]>
  // key = 子图层相对路径 ID, value = 可覆盖的属性列表
}
```

**Layer 扩展：**

```typescript
// LayerType 新增 'instance'
type LayerType = 'frame' | 'rectangle' | 'ellipse' | 'text' | 'image' | 'group' | 'instance'

// Layer 新增可选字段
interface Layer {
  // ...existing...
  componentId?: string   // instance 类型专用，指向 ComponentDef.id
  instanceOverrides?: Record<string, Partial<AnimatableProps & { text?: string; imageSrc?: string }>>
  // key = master 子图层 ID, value = 覆盖值
}
```

**Project 新增：**

```typescript
interface Project {
  // ...existing...
  components: ComponentDef[]
}
```

### 渲染链路

```
Instance Layer
    │
    ▼
找到 componentId → ComponentDef → rootLayerId → master 子树
    │
    ▼
克隆 master 子树结构 (只读引用，不复制)
    │
    ▼
叠加 instanceOverrides → 最终渲染属性
    │
    ▼
递归: master 子树里如果有 instance 图层 → 继续解析 (检测循环)
```

### Patch 运行时

- 每个 instance 在 Preview 时克隆 master 的 Patch 子图
- 克隆时重映射 layerId: master 子图层 ID → instance 作用域
- 变量也克隆: 每个 instance 有独立的变量状态
- 销毁 instance 时清理克隆的 Patch 和变量

### 循环检测

创建 instance 时检查: componentId 的 master 子树里是否包含指向自身的 instance。
用 DFS 遍历，发现环则拒绝创建。

## 架构约束

- ComponentDef 存在 engine 层 (SceneTypes)
- 解析逻辑在 engine 层 (新建 ComponentResolver)
- UI 层通过 store 调用，不直接操作 ComponentDef
- DOMRenderer 渲染 instance 时调用 resolver 获取最终属性

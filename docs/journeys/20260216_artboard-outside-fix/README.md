# 旅程: Artboard 外绘制修复

> Flow E · 2026-02-16 · 画像: 基础绘制 · 目标: 解决图层绘制到 Artboard 外部的根因

## 问题现象

缩放较小时 (zoom ≈ 0.41)，画板仅占画布 17% 面积。用户在画布区域拖拽绘制，图层创建在 X:-305 等负坐标位置。

## 根因诊断

**坐标变换链** (`useDrawTool.ts`):

```
screen → resolveFrame() → artboard-frame.getBoundingClientRect() → artboard-local ✅
screen → fallback: querySelector 找激活画板 → 画板外点击也"绑定"到画板 → 负坐标 ❌
```

`resolveFrame()` 有 `??` 回退: 当 `closest('.artboard-frame')` 失败时 (点在画板外)，`querySelector('.artboard.active .artboard-frame')` "好心"找到了激活画板。坐标映射公式 `(clientX - frame.left) / zoom` 对画板外的点产出负值。

## 恢复手段探索 (不用属性面板)

| 手段 | 结果 | 原因 |
|---|---|---|
| 拖拽回画板 | **失败** | `overflow:hidden` 裁剪了层 DOM，pointer 命中不了 |
| 图层面板选中 + 方向键 | 可行但低效 | 1px/次，Shift 10px/次，需 30+ 次 |
| Cmd+Z 撤销 | 可行 | 但需要重画 |

结论: 没有便捷的事后恢复手段，必须在源头防止。

## 修复方案

**核心变更: 移除 querySelector 回退，画板外不响应绘制。**

```diff
- return closest('.artboard-frame') ?? querySelector('.artboard.active .artboard-frame')
+ return closest('.artboard-frame')
```

影响文件:
- `src/composables/useDrawTool.ts`: resolveFrame 移除回退 + down() 早退 + toArtboard 移除 fallback 死代码
- `src/composables/useTextTool.ts`: 同步修复

## 验证结果

| 测试 | 操作 | 结果 |
|---|---|---|
| 画板外绘制矩形 | x=480 (画板 left=606) | **被拒绝**, 无图层创建 ✅ |
| 画板内绘制矩形 | x=650 | X:105, Y:180 正常 ✅ |
| 画板外创建文本 | x=480 | **被拒绝** ✅ |
| 画板内创建文本 | x=680 | X:177, Y:421 正常 ✅ |

## 设计哲学

这不是一个坐标计算 bug，而是一个**入口合法性**问题。修复不是修补数学公式，而是消除不应存在的代码路径。

> "好代码就是不需要例外的代码。" —— 移除 querySelector 回退后，toArtboard 的 fallback 分支自然变成死代码，一并清除。特殊情况被消除，而不是被处理。

## 截图列表

- step-05: 复现 - 画板外绘制 X:-305
- step-07: 图层面板选中
- step-08/09: 方向键移动 (1px / 10px)
- step-16: 修复后 - 画板外绘制被拒绝
- step-18: 修复后 - 画板内绘制 X:105
- step-22: 修复后 - 文本画板内创建 X:177

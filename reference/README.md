# 参考源码 (Reference Only)

**⚠️ 不要修改这些文件。这些是移植参考源码。**

## folme/

Folme 动画引擎的 AS3 原始实现 (ActionScript 3)。
移植目标: `src/engine/folme/`

核心文件:
- `FolmeManager.as` — 元素级管理器 (to/setTo/cancel)
- `Ani.as` — 单属性动画实例
- `AniRequest.as` — 动画请求 (delay/range/曲线)
- `Timeline.as` — 全局 rAF 循环
- `FolmeEase.as` — 曲线工厂
- `FolmeDrag.as` — 拖拽交互 (跟手/惯性/overscroll/absorb)
- `Sugar.as` — 预设交互 (mouseDown/mouseUp/show/hide)
- `SpeedTracker.as` — 速度追踪
- `force/Spring.as` — 弹簧力 (response + damping)
- `force/Friction.as` — 摩擦力
- `force/Immediate.as` — 立即设值

## MouseAction.as

手势识别引擎的 AS3 原始实现。
移植目标: `src/engine/gesture/TouchEngine.ts`

核心: down/startMove/move/up 原子事件 + 速度追踪 + click/longClick 判定。

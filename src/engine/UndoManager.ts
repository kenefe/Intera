// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UndoManager —— 通用撤销/重做栈
//  职责: 快照级别的 undo/redo 管理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  采用快照方式而非 Command 模式:
//   - 项目数据量小，JSON 序列化成本低
//   - 无需为每种操作编写逆向逻辑
//   - 天然不会出现 undo/redo 不一致的 bug
//

export class UndoManager<T> {
  private undoStack: T[] = []
  private redoStack: T[] = []
  private max: number

  constructor(max = 50) { this.max = max }

  // ── 压栈 (操作前的状态)，清空 redo 栈 ──

  push(state: T): void {
    this.undoStack.push(state)
    if (this.undoStack.length > this.max) this.undoStack.shift()
    this.redoStack.length = 0
  }

  // ── 撤销: 弹 undo 栈顶 → 当前推入 redo ──

  undo(current: T): T | null {
    const prev = this.undoStack.pop()
    if (!prev) return null
    this.redoStack.push(current)
    return prev
  }

  // ── 重做: 弹 redo 栈顶 → 当前推入 undo ──

  redo(current: T): T | null {
    const next = this.redoStack.pop()
    if (!next) return null
    this.undoStack.push(current)
    return next
  }

  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }

  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }
}

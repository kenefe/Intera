// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  propHelpers —— 属性面板共享工具函数
//  从 DOM Event 中安全提取数值 / 字符串
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 从 input 事件提取浮点数 */
export function num(e: Event): number {
  return parseFloat((e.target as HTMLInputElement).value) || 0
}

/** 从 input 事件提取整数像素值 */
export function px(e: Event): number {
  return Math.round(num(e))
}

/** 安全取整显示值 (undefined → 0) */
export function dpx(v: number | undefined): number {
  return Math.round(v ?? 0)
}

/** 从 input 事件提取字符串 */
export function str(e: Event): string {
  return (e.target as HTMLInputElement).value
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  idFactory —— 统一 ID 生成
//  全局唯一，可预测前缀，零碰撞
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let counter = 1

/** 生成带前缀的唯一 ID: prefix_1, prefix_2, ... */
export function makeId(prefix: string): string {
  return `${prefix}_${counter++}`
}

/** 重置计数器 (仅测试用) */
export function resetIdCounter(start = 1): void {
  counter = start
}

/** 同步计数器到已有最大值 (加载项目后调用) */
export function syncIdCounter(ids: string[]): void {
  for (const id of ids) {
    const n = parseInt(id.split('_').pop() ?? '0', 10)
    if (n >= counter) counter = n + 1
  }
}

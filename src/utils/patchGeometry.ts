// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  patchGeometry —— Patch 画布几何运算
//  职责: 贝塞尔路径 + 碰撞检测
//  纯函数, 零依赖
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** SVG 三次贝塞尔路径 (水平控制点偏移) */
export function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

// ── 线段交叉检测 ──

/** 两条线段是否交叉 (叉积符号判定) */
export function segmentsCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
      && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/**
 * 线段是否穿过水平贝塞尔 (采样逼近)
 * 将三次贝塞尔离散化为 N 段折线，逐段检测与切割线的交叉
 */
export function lineCutsBezier(
  lx1: number, ly1: number, lx2: number, ly2: number,
  px1: number, py1: number, px2: number, py2: number,
  samples = 20,
): boolean {
  const hdx = Math.abs(px2 - px1) * 0.5
  const cpx1 = px1 + hdx, cpx2 = px2 - hdx
  let prevX = px1, prevY = py1
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const u = 1 - t
    const x = u * u * u * px1 + 3 * u * u * t * cpx1 + 3 * u * t * t * cpx2 + t * t * t * px2
    const y = u * u * u * py1 + 3 * u * u * t * py1 + 3 * u * t * t * py2 + t * t * t * py2
    if (segmentsCross(lx1, ly1, lx2, ly2, prevX, prevY, x, y)) return true
    prevX = x; prevY = y
  }
  return false
}

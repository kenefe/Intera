import { ref } from 'vue'
import type { AnimatableProps } from '@engine/scene/types'

export interface GuideLine { axis: 'x' | 'y'; pos: number }

const SNAP = 5

export function useSnapGuides() {
  const guides = ref<GuideLine[]>([])
  let targets: { l: number; cx: number; r: number; t: number; cy: number; b: number }[] = []

  function setTargets(layers: Record<string, { props: AnimatableProps }>, skipIds: Set<string>, canvasW: number, canvasH: number) {
    targets = []
    for (const [id, layer] of Object.entries(layers)) {
      if (skipIds.has(id)) continue
      const p = layer.props
      targets.push({ l: p.x, cx: p.x + p.width / 2, r: p.x + p.width, t: p.y, cy: p.y + p.height / 2, b: p.y + p.height })
    }
    // canvas edges
    targets.push({ l: 0, cx: canvasW / 2, r: canvasW, t: 0, cy: canvasH / 2, b: canvasH })
  }

  function snap(x: number, y: number, w: number, h: number): { dx: number; dy: number } {
    const edges = { l: x, cx: x + w / 2, r: x + w }
    const vedges = { t: y, cy: y + h / 2, b: y + h }
    let dx = 0, dy = 0
    const lines: GuideLine[] = []

    for (const t of targets) {
      for (const ek of ['l', 'cx', 'r'] as const) {
        for (const tk of ['l', 'cx', 'r'] as const) {
          const d = t[tk] - edges[ek]
          if (Math.abs(d) < SNAP && dx === 0) { dx = d; lines.push({ axis: 'x', pos: t[tk] }) }
        }
      }
      for (const ek of ['t', 'cy', 'b'] as const) {
        for (const tk of ['t', 'cy', 'b'] as const) {
          const d = t[tk] - vedges[ek]
          if (Math.abs(d) < SNAP && dy === 0) { dy = d; lines.push({ axis: 'y', pos: t[tk] }) }
        }
      }
    }
    guides.value = lines
    return { dx, dy }
  }

  function clear() { guides.value = [] }

  return { guides, setTargets, snap, clear }
}

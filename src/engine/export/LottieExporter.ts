// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LottieExporter —— Lottie JSON 导出
//  弹簧轨迹 → 逐帧烘焙关键帧 (hold interpolation)
//  支持: 矩形 + 位移/缩放/旋转/透明度动画
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Project, AnimatableProps } from '../scene/types'
import { resolveProps } from './resolve'
import { simulate } from './SpringSim'

// ── 颜色转换 ──

function hexToRgb(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ]
}

// ── Lottie 属性帮手 ──

type LProp = { a: 0; k: number | number[] } | { a: 1; k: Array<{ t: number; s: number[]; h?: number }> }

function staticVal(v: number | number[]): LProp { return { a: 0, k: v } }

function bakedFrames(values: number[], wrap = false): LProp {
  if (values.length <= 1) return staticVal(wrap ? [values[0] ?? 0] : (values[0] ?? 0))
  return {
    a: 1,
    k: values.map((v, i) => ({ t: i, s: wrap ? [v] : [v], h: i < values.length - 1 ? 1 : undefined })),
  }
}

// ── 图层 → Lottie shape layer ──

function buildLayer(
  idx: number, name: string,
  from: AnimatableProps, to: AnimatableProps,
  damping: number, response: number, totalFrames: number,
): Record<string, unknown> {
  const fps = 60

  // 模拟各属性轨迹
  const sim = (f: number, t: number) => simulate(f, t, damping, response, fps)
  const posX = sim(from.x, to.x)
  const posY = sim(from.y, to.y)
  const sX   = sim(from.scaleX * 100, to.scaleX * 100)
  const sY   = sim(from.scaleY * 100, to.scaleY * 100)
  const rot  = sim(from.rotation, to.rotation)
  const opa  = sim(from.opacity * 100, to.opacity * 100)

  const animated = (a: AnimatableProps, b: AnimatableProps, k: keyof AnimatableProps) =>
    a[k] !== b[k]

  return {
    ty: 4, nm: name, ind: idx, ip: 0, op: totalFrames, st: 0,
    ks: {
      o: animated(from, to, 'opacity') ? bakedFrames(opa) : staticVal(from.opacity * 100),
      r: animated(from, to, 'rotation') ? bakedFrames(rot) : staticVal(from.rotation),
      p: (animated(from, to, 'x') || animated(from, to, 'y'))
        ? { a: 1, k: posX.map((x, i) => ({ t: i, s: [x, posY[i] ?? to.y], h: i < posX.length - 1 ? 1 : undefined })) }
        : staticVal([from.x, from.y]),
      a: staticVal([0, 0]),
      s: (animated(from, to, 'scaleX') || animated(from, to, 'scaleY'))
        ? { a: 1, k: sX.map((x, i) => ({ t: i, s: [x, sY[i] ?? to.scaleY * 100], h: i < sX.length - 1 ? 1 : undefined })) }
        : staticVal([from.scaleX * 100, from.scaleY * 100]),
    },
    shapes: [
      { ty: 'rc', nm: 'Rect', p: staticVal([0, 0]), s: staticVal([from.width, from.height]), r: staticVal(from.borderRadius), d: 1 },
      { ty: 'fl', nm: 'Fill', c: staticVal(hexToRgb(from.fill)), o: staticVal(100) },
    ],
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  导出入口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function exportLottie(project: Project): Record<string, unknown> {
  // 导出目标: 主画面 (stateGroups[0]) — 未来可扩展为接受 groupId 参数
  const group = project.stateGroups[0]
  const states = group?.displayStates ?? []
  const fromState = states[0]
  const toState = states[1]
  const { width: w, height: h } = project.canvasSize

  // 过渡曲线参数
  const tc = toState?.transition.curve
  const damping = tc?.damping ?? 0.95
  const response = tc?.response ?? 0.35

  // 计算最长轨迹帧数 (决定总时长)
  let maxLen = 60
  const layers: Record<string, unknown>[] = []

  for (let i = 0; i < project.rootLayerIds.length; i++) {
    const lid = project.rootLayerIds[i]
    const layer = project.layers[lid]
    if (!layer) continue
    const from = resolveProps(project, fromState?.id ?? '', lid)
    const to = toState ? resolveProps(project, toState.id, lid) : from
    const trajX = simulate(from.x, to.x, damping, response)
    maxLen = Math.max(maxLen, trajX.length)
    layers.push(buildLayer(i, layer.name, from, to, damping, response, maxLen))
  }

  // 修正所有层的 op
  for (const l of layers) (l as { op: number }).op = maxLen

  return {
    v: '5.7.4', fr: 60, ip: 0, op: maxLen,
    w, h, nm: project.name,
    layers,
    assets: [], markers: [],
  }
}

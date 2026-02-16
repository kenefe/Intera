// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VideoExporter —— WebM 视频导出
//  Canvas2D 逐帧绘制 + MediaRecorder 编码
//  离线渲染，不依赖 DOM 画布
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Project, AnimatableProps } from '../scene/types'
import { resolveProps } from './resolve'
import { simulate } from './SpringSim'

// ── Canvas2D 图层绘制 ──

function drawLayer(ctx: CanvasRenderingContext2D, p: AnimatableProps): void {
  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2)
  ctx.rotate(p.rotation * Math.PI / 180)
  ctx.scale(p.scaleX, p.scaleY)
  ctx.fillStyle = p.fill
  ctx.beginPath()
  ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, p.borderRadius)
  ctx.fill()
  if (p.stroke !== 'none' && p.strokeWidth > 0) {
    ctx.strokeStyle = p.stroke
    ctx.lineWidth = p.strokeWidth
    ctx.stroke()
  }
  ctx.restore()
}

// ── 属性插值 (用预计算轨迹) ──

type Trajectory = Record<string, number[]>   // propName → frame values

const NUM_KEYS: (keyof AnimatableProps)[] = [
  'x', 'y', 'width', 'height', 'rotation',
  'scaleX', 'scaleY', 'opacity', 'borderRadius', 'strokeWidth',
]

function buildTrajectory(
  from: AnimatableProps, to: AnimatableProps,
  damping: number, response: number,
): Trajectory {
  const traj: Trajectory = {}
  for (const k of NUM_KEYS) {
    const fv = from[k] as number, tv = to[k] as number
    traj[k] = fv === tv ? [fv] : simulate(fv, tv, damping, response)
  }
  return traj
}

function sampleProps(base: AnimatableProps, traj: Trajectory, frame: number): AnimatableProps {
  const p = { ...base }
  for (const k of NUM_KEYS) {
    const arr = traj[k]
    ;(p[k] as number) = arr[Math.min(frame, arr.length - 1)]
  }
  return p
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  导出入口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function exportVideo(project: Project): Promise<Blob> {
  const { width: cw, height: ch } = project.canvasSize
  // 导出目标: 主画面 (stateGroups[0]) — 未来可扩展为接受 groupId 参数
  const group = project.stateGroups[0]
  const states = group?.displayStates ?? []
  const fromState = states[0]
  const toState = states[1]

  const tc = toState?.transition.curve
  const damping = tc?.damping ?? 0.95
  const response = tc?.response ?? 0.35

  // 预计算各图层轨迹
  const layerData: Array<{ base: AnimatableProps; traj: Trajectory }> = []
  let maxFrames = 60

  for (const lid of project.rootLayerIds) {
    const from = resolveProps(project, fromState?.id ?? '', lid)
    const to = toState ? resolveProps(project, toState.id, lid) : from
    const traj = buildTrajectory(from, to, damping, response)
    for (const arr of Object.values(traj)) maxFrames = Math.max(maxFrames, arr.length)
    layerData.push({ base: from, traj })
  }

  // 创建离屏 Canvas + MediaRecorder
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')!
  const stream = canvas.captureStream(60)
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }

  // 逐帧录制
  recorder.start()
  for (let f = 0; f < maxFrames; f++) {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, cw, ch)
    for (const ld of layerData) drawLayer(ctx, sampleProps(ld.base, ld.traj, f))
    await waitFrame()
  }
  recorder.stop()

  return new Promise<Blob>(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
  })
}

function waitFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()))
}

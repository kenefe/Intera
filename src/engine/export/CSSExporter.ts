// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CSSExporter —— 独立 HTML 导出
//  输出: 完整 HTML (CSS + 弹簧微引擎 JS + 交互绑定)
//  零外部依赖，可直接在浏览器打开
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { Project, AnimatableProps, Patch, PatchConnection } from '../scene/types'
import { resolveProps } from './resolve'

// ── 层样式 → CSS ──

function layerCSS(id: string, p: AnimatableProps): string {
  const s = [
    `position:absolute`,
    `width:${p.width}px`, `height:${p.height}px`,
    `transform:translate(${p.x}px,${p.y}px) rotate(${p.rotation}deg) scale(${p.scaleX},${p.scaleY})`,
    `opacity:${p.opacity}`,
    `background:${p.fill}`,
    `border-radius:${p.borderRadius}px`,
    `box-sizing:border-box`,
  ]
  if (p.stroke !== 'none' && p.strokeWidth > 0) {
    s.push(`border:${p.strokeWidth}px solid ${p.stroke}`)
  }
  return `.l-${id}{${s.join(';')}}`
}

// ── HTML 元素 ──

function layerHTML(id: string, name: string): string {
  return `  <div class="l-${id}" data-lid="${id}">${name}</div>`
}

// ── 内嵌 JS: 弹簧微引擎 ──

const SPRING_RT = `
function springTo(el,from,to,cfg){
  var d=cfg.damping||.95,r=cfg.response||.35,
      T=(2*Math.PI/r)*(2*Math.PI/r),C=Math.min(4*Math.PI*d/r,60),
      st={},dt=1/60,raf;
  for(var k in to)st[k]={v:from[k]!==undefined?from[k]:0,s:0,t:to[k]};
  function tick(){var m=false;
    for(var k in st){var o=st[k],
      imp=(-o.s*C+T*(o.t-o.v))*dt;
      o.s+=imp;o.v+=o.s*dt;
      if(Math.abs(o.s)>.0001||Math.abs(o.v-o.t)>.001)m=true;
      else{o.v=o.t;o.s=0}}
    el.style.transform='translate('+(st.x?st.x.v:0)+'px,'+(st.y?st.y.v:0)+'px) rotate('
      +(st.rotation?st.rotation.v:0)+'deg) scale('
      +(st.scaleX?st.scaleX.v:1)+','+(st.scaleY?st.scaleY.v:1)+')';
    if(st.opacity)el.style.opacity=st.opacity.v;
    if(st.width)el.style.width=st.width.v+'px';
    if(st.height)el.style.height=st.height.v+'px';
    if(m)raf=requestAnimationFrame(tick)}
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(tick)}`.trim()

// ── Patch 交互 → JS 事件绑定 ──

function buildInteractionJS(project: Project): string {
  const lines: string[] = []
  for (const p of project.patches) {
    if (p.type !== 'touch') continue
    const lid = p.config.layerId as string | undefined
    if (!lid) continue
    // 找连线: down/up/tap → to 节点
    for (const port of ['down', 'up', 'tap']) {
      const conn = project.connections.find(c => c.fromPatchId === p.id && c.fromPortId === port)
      if (!conn) continue
      const target = project.patches.find(n => n.id === conn.toPatchId)
      if (!target || target.type !== 'to') continue
      const stateId = target.config.stateId as string | undefined
      if (!stateId) continue
      const props = resolveProps(project, stateId, lid)
      const ev = port === 'down' ? 'pointerdown' : port === 'up' ? 'pointerup' : 'click'
      const from = numericObj(resolveProps(project, project.stateGroups[0]?.displayStates[0]?.id ?? '', lid))
      const to = numericObj(props)
      const tc = project.stateGroups.flatMap(g => g.displayStates).find(s => s.id === stateId)?.transition
      const cfg = `{damping:${tc?.curve.damping ?? 0.95},response:${tc?.curve.response ?? 0.35}}`
      lines.push(
        `document.querySelector('[data-lid="${lid}"]').addEventListener('${ev}',function(){` +
        `springTo(this,${JSON.stringify(from)},${JSON.stringify(to)},${cfg})});`,
      )
    }
  }
  return lines.join('\n')
}

function numericObj(p: AnimatableProps): Record<string, number> {
  return {
    x: p.x, y: p.y, width: p.width, height: p.height,
    rotation: p.rotation, scaleX: p.scaleX, scaleY: p.scaleY, opacity: p.opacity,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  导出入口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function exportCSS(project: Project): string {
  const defaultState = project.stateGroups[0]?.displayStates[0]
  const stateId = defaultState?.id ?? ''
  const { width: cw, height: ch } = project.canvasSize

  const cssRules: string[] = []
  const htmlParts: string[] = []

  for (const id of project.rootLayerIds) {
    const layer = project.layers[id]
    if (!layer) continue
    const props = resolveProps(project, stateId, id)
    cssRules.push(layerCSS(id, props))
    htmlParts.push(layerHTML(id, layer.name))
  }

  const interactionJS = buildInteractionJS(project)

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${project.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111}
.canvas{position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:#1a1a2e}
${cssRules.join('\n')}
</style>
</head>
<body>
<div class="canvas">
${htmlParts.join('\n')}
</div>
<script>
${SPRING_RT}
${interactionJS}
</script>
</body>
</html>`
}

<template lang="pug">
svg.layer-icon(
  viewBox="0 0 16 16"
  fill="none"
  :data-type="type"
  :class="[type, { active }]"
)
  //- 容器: 四角框架 (Figma 风格)
  template(v-if="type === 'frame'")
    path(
      d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"
      stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round"
    )

  //- 矩形: 圆角矩形轮廓
  template(v-else-if="type === 'rectangle'")
    rect(
      x="2.5" y="3.5" width="11" height="9" rx="1.5"
      stroke="currentColor" stroke-width="1.3"
    )

  //- 椭圆: 圆形
  template(v-else-if="type === 'ellipse'")
    circle(cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.3")

  //- 文本: T 字形
  template(v-else-if="type === 'text'")
    path(
      d="M5 4h6M8 4v8"
      stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
    )

  //- 图片: 山景 + 太阳
  template(v-else-if="type === 'image'")
    rect(
      x="2" y="3" width="12" height="10" rx="1.5"
      stroke="currentColor" stroke-width="1.1"
    )
    circle(cx="5.5" cy="6.5" r="1.2" fill="currentColor")
    path(
      d="M2 11l3.5-3 2 1.5 2.5-3L14 11"
      stroke="currentColor" stroke-width="1" stroke-linejoin="round"
    )

  //- 分组: 叠层矩形
  template(v-else-if="type === 'group'")
    rect(x="3" y="2" width="10" height="5.5" rx="1" stroke="currentColor" stroke-width="1.1")
    rect(x="3" y="8.5" width="10" height="5.5" rx="1" stroke="currentColor" stroke-width="1.1")

  //- 未知类型回退
  template(v-else)
    text(x="8" y="12" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700") ?
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LayerIcon —— 图层类型图标
//  用 SVG 几何形状传达图层类型，形状即含义
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
defineProps<{ type: string; active?: boolean }>()
</script>

<style scoped>
/* ── 基础尺寸 ── */
.layer-icon { width: 16px; height: 16px; flex-shrink: 0; }

/* ── 类型着色: 语义化视觉区分 ── */
.frame     { color: #818cf8; }
.rectangle { color: #60a5fa; }
.ellipse   { color: #a78bfa; }
.text      { color: #fbbf24; }
.image     { color: #4ade80; }
.group     { color: #94a3b8; }

/* ── 选中态: 统一高亮 ── */
.active { color: #b4b4ff; }
</style>

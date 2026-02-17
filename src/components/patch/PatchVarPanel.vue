<template lang="pug">
.patch-var-panel(:class="{ collapsed }")
  //- ── 折叠态: 竖排标签 ──
  .toggle-strip(v-if="collapsed" @click="collapsed = false" title="展开变量面板")
    span.strip-label 变量

  //- ── 展开态: 变量列表 ──
  template(v-else)
    .panel-header
      span.panel-title 变量 ({{ vars.length }})
      .header-actions
        button.btn-add(@click="onAdd" title="新建变量") +
        button.btn-collapse(@click="collapsed = true" title="收起") ▶
    .var-list
      .var-item(v-for="v in vars" :key="v.id")
        .var-row
          input.var-name(
            :value="v.name"
            @change="onRename(v.id, $event)"
            spellcheck="false"
            :title="v.name"
          )
          select.var-type(:value="v.type" @change="onTypeChange(v.id, $event)")
            option(value="boolean") Bool
            option(value="number") Num
            option(value="string") Str
          button.var-del(@click="onDelete(v.id)" title="删除") ×
        .var-default
          span.default-label 默认
          //- 布尔 → 开关式下拉
          select.default-val(
            v-if="v.type === 'boolean'"
            :value="String(v.defaultValue)"
            @change="onDefaultChange(v.id, v.type, $event)"
          )
            option(value="false") false
            option(value="true") true
          //- 数字 / 字符串 → 输入框
          input.default-val(
            v-else
            :type="v.type === 'number' ? 'number' : 'text'"
            :value="v.defaultValue"
            @change="onDefaultChange(v.id, v.type, $event)"
            placeholder="默认值"
          )
      .var-empty(v-if="vars.length === 0")
        span 暂无变量
        span.empty-hint 点击 + 创建
</template>

<script setup lang="ts">
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PatchVarPanel —— 变量管理面板
//  职责: 变量的增删改查 (CRUD)
//  位置: Patch 画布右侧，可折叠
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { ref, computed } from 'vue'
import type { VariableType } from '@engine/scene/types'
import { useProjectStore } from '@store/project'
import { usePatchStore } from '@store/patch'

const project = useProjectStore()
const patchStore = usePatchStore()
const collapsed = ref(false)

// ── 数据源 ──

const vars = computed(() => project.project.variables)

// ── 类型 → 默认值映射 ──

const TYPE_DEFAULTS: Record<string, boolean | number | string> = {
  boolean: false, number: 0, string: '',
}

// ── 操作 ──

function onAdd(): void {
  const n = vars.value.length
  const name = n === 0 ? 'myVar' : `myVar_${n + 1}`
  patchStore.addVariable(name, 'boolean', false)
}

function onRename(id: string, e: Event): void {
  const name = (e.target as HTMLInputElement).value.trim()
  if (name) patchStore.updateVariable(id, { name })
}

function onTypeChange(id: string, e: Event): void {
  const type = (e.target as HTMLSelectElement).value as VariableType
  patchStore.updateVariable(id, { type, defaultValue: TYPE_DEFAULTS[type] })
}

function onDefaultChange(id: string, type: string, e: Event): void {
  const raw = (e.target as HTMLInputElement).value
  const val = type === 'boolean' ? raw === 'true'
    : type === 'number' ? Number(raw) || 0
    : raw
  patchStore.updateVariable(id, { defaultValue: val })
}

function onDelete(id: string): void {
  patchStore.removeVariable(id)
}
</script>

<style scoped>
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  变量面板 — 与 Patch 画布同色系     */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

.patch-var-panel {
  width: 160px;
  min-width: 160px;
  background: var(--surface-1);
  border-left: 1px solid var(--border-subtle);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width var(--duration-normal) var(--ease-out),
              min-width var(--duration-normal) var(--ease-out);
}

.patch-var-panel.collapsed { width: 28px; min-width: 28px; }

/* ── 折叠态竖排标签 ── */

.toggle-strip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.toggle-strip:hover { background: rgba(255, 255, 255, 0.04); }

.strip-label {
  writing-mode: vertical-rl;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: 2px;
  user-select: none;
}

/* ── 面板头部 ── */

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--border-subtle);
}

.panel-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
}

.header-actions { display: flex; gap: var(--sp-1); }

.btn-add, .btn-collapse {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-tertiary);
  font-size: var(--text-base);
  cursor: pointer;
  padding: 0;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.btn-add:hover, .btn-collapse:hover {
  background: var(--accent-bg);
  color: var(--accent-text);
}

/* ── 变量列表 ── */

.var-list { flex: 1; overflow-y: auto; padding: var(--sp-1) 0; }

.var-item {
  padding: var(--sp-1) var(--sp-3);
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--duration-fast);
}

.var-item:hover { background: rgba(255, 255, 255, 0.02); }

.var-row { display: flex; align-items: center; gap: var(--sp-1); }

.var-name {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  padding: 2px var(--sp-1);
  outline: none;
  transition: border-color var(--duration-fast), background var(--duration-fast);
}

.var-name:hover { border-color: var(--border-default); }

.var-name:focus {
  border-color: var(--accent-border);
  background: rgba(255, 255, 255, 0.04);
}

.var-type {
  width: 48px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: 9px;
  padding: 2px 2px;
  cursor: pointer;
  outline: none;
}

.var-type:focus { border-color: var(--accent-border); }

.var-del {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-disabled);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.var-del:hover { background: var(--danger-bg); color: var(--danger); }

/* ── 默认值行 ── */

.var-default {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-top: 2px;
  padding-left: var(--sp-1);
}

.default-label {
  font-size: 9px;
  color: var(--text-disabled);
  flex-shrink: 0;
}

.default-val {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  padding: 1px var(--sp-1);
  outline: none;
  transition: border-color var(--duration-fast);
}

.default-val:focus { border-color: var(--accent-border); }

/* ── 空状态 ── */

.var-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--sp-6) var(--sp-3);
  color: var(--text-disabled);
  font-size: var(--text-sm);
  gap: var(--sp-1);
}

.empty-hint { font-size: 9px; opacity: 0.6; }
</style>

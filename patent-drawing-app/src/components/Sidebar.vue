<script setup lang="ts">
import type { Conversation } from '../api/types'

defineProps<{
  conversations: Conversation[]
  activeId: string
  collapsed: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  'new-chat': []
  delete: [id: string]
  toggle: []
}>()
</script>

<template>
  <aside :class="['sidebar', { collapsed }]">
    <div class="sidebar-header">
      <h1 class="sidebar-title">{{ collapsed ? '🎨' : '🎨 Text2Image' }}</h1>
      <button
        class="btn-icon"
        :title="collapsed ? 'Expand' : 'Collapse'"
        @click="emit('toggle')"
      >
        {{ collapsed ? '→' : '←' }}
      </button>
    </div>

    <button class="btn-new-chat" @click="emit('new-chat')">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span v-if="!collapsed">New Chat</span>
    </button>

    <div class="sidebar-list">
      <div
        v-for="c in conversations"
        :key="c.id"
        :class="['sidebar-item', { active: c.id === activeId }]"
        @click="emit('select', c.id)"
      >
        <template v-if="!collapsed">
          <span class="sidebar-item-title">{{ c.title }}</span>
          <button
            class="btn-delete"
            @click.stop="emit('delete', c.id)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </button>
        </template>
        <span v-else class="sidebar-item-dot" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  min-height: 56px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
}

.collapsed .sidebar-title {
  font-size: 20px;
}

.btn-icon {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.btn-new-chat {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px;
  padding: 10px 16px;
  background: var(--accent-soft);
  border: 1px solid rgba(124, 92, 252, 0.25);
  border-radius: var(--radius-md);
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.btn-new-chat:hover {
  background: var(--accent-glow);
  border-color: var(--accent);
}

.collapsed .btn-new-chat {
  padding: 10px;
  justify-content: center;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 2px;
}

.sidebar-item:hover {
  background: var(--bg-hover);
}

.sidebar-item.active {
  background: var(--accent-soft);
  border: 1px solid rgba(124, 92, 252, 0.15);
}

.sidebar-item-title {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.sidebar-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dim);
}

.sidebar-item.active .sidebar-item-dot {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: all 0.15s;
}

.sidebar-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: var(--error);
  background: var(--error-bg);
}
</style>

<script setup lang="ts">
defineProps<{
  imageModel: string
  chatModel: string
}>()

const emit = defineEmits<{
  'update:imageModel': [value: string]
  'update:chatModel': [value: string]
  close: []
}>()
</script>

<template>
  <div class="settings-overlay" @click="emit('close')">
    <div class="settings-panel" @click.stop>
      <h2>Settings</h2>

      <div class="settings-group">
        <label>Image Generation Model</label>
        <input
          type="text"
          :value="imageModel"
          @input="emit('update:imageModel', ($event.target as HTMLInputElement).value)"
          placeholder="e.g. Qwen/Qwen-Image-2512"
        />
        <span class="settings-hint">Model ID from ModelScope that supports image generation</span>
      </div>

      <div class="settings-group">
        <label>Chat Model (for prompt refinement)</label>
        <input
          type="text"
          :value="chatModel"
          @input="emit('update:chatModel', ($event.target as HTMLInputElement).value)"
          placeholder="e.g. Qwen/Qwen2.5-72B-Instruct"
        />
        <span class="settings-hint">Used to refine prompts with conversation context</span>
      </div>

      <div class="settings-group">
        <label>API Proxy</label>
        <input type="text" value="/api (Vite Proxy → FastAPI Backend)" disabled />
        <span class="settings-hint">Requests are proxied to local FastAPI backend via Vite dev server</span>
      </div>

      <button class="btn-primary" @click="emit('close')">Done</button>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.settings-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 32px;
  width: 480px;
  max-width: 90vw;
}

.settings-panel h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text);
}

.settings-group {
  margin-bottom: 20px;
}

.settings-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.settings-group input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 14px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.settings-group input:focus {
  border-color: var(--accent);
}

.settings-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-hint {
  display: block;
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 6px;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatMessage } from '../api/types'

const props = defineProps<{
  msg: ChatMessage
  formatTime: (ts: number) => string
}>()

const isUser = computed(() => props.msg.role === 'user')
const imgLoaded = ref(false)
const imgError = ref(false)

function openImage() {
  if (props.msg.imageUrl) {
    window.open(props.msg.imageUrl, '_blank')
  }
}
</script>

<template>
  <div :class="['msg-row', isUser ? 'msg-user' : 'msg-assistant']">
    <div :class="['msg-avatar', isUser ? 'avatar-user' : 'avatar-ai']">
      {{ isUser ? 'U' : 'AI' }}
    </div>

    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-role">{{ isUser ? 'You' : 'AI' }}</span>
        <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
      </div>

      <div v-if="msg.content" class="msg-content">
        <p>{{ msg.content }}</p>
      </div>

      <div v-if="msg.loading" class="msg-loading">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="spinner"
        >
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1" />
        </svg>
        <div class="spinner-text">
          <span>Generating image...</span>
          <span v-if="msg.statusText" class="status-text">{{ msg.statusText }}</span>
        </div>
      </div>

      <div v-if="msg.error" class="msg-error">
        <span>{{ msg.error }}</span>
      </div>

      <div v-if="msg.imageUrl && !msg.loading" class="msg-image-container">
        <div v-if="!imgLoaded && !imgError" class="img-placeholder">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.3"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>

        <div
          v-if="imgError"
          class="img-placeholder img-error-placeholder"
        >
          <span>Failed to load image</span>
        </div>

        <img
          :src="msg.imageUrl"
          :alt="msg.content"
          :class="['msg-image', { loaded: imgLoaded }]"
          @load="imgLoaded = true"
          @error="imgError = true"
          @click="openImage"
        />

        <a
          v-if="imgLoaded"
          class="img-download"
          :href="msg.imageUrl"
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
        >
          ↗
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  gap: 14px;
  padding: 16px 24px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar-user {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: #fff;
}

.avatar-ai {
  background: linear-gradient(135deg, #7c5cfc, #a78bfa);
  color: #fff;
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.msg-role {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.msg-time {
  font-size: 11px;
  color: var(--text-dim);
}

.msg-content {
  margin-bottom: 10px;
}

.msg-content p {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-muted);
}

.msg-user .msg-content p {
  color: var(--text);
}

.msg-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.msg-loading span {
  font-size: 13px;
  color: var(--text-muted);
  min-width: 0;
}

.spinner-text {
  display: flex;
  flex-direction: column;
}

.status-text {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}

.msg-error {
  padding: 10px 16px;
  background: var(--error-bg);
  border: 1px solid rgba(229, 62, 62, 0.25);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 13px;
}

/* Image Display */
.msg-image-container {
  position: relative;
  display: inline-block;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  max-width: 512px;
}

.img-placeholder {
  width: 512px;
  height: 512px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
}

.img-error-placeholder {
  flex-direction: column;
  gap: 8px;
  color: var(--text-dim);
  font-size: 13px;
}

.msg-image {
  display: block;
  max-width: 512px;
  max-height: 512px;
  width: auto;
  height: auto;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.msg-image.loaded {
  opacity: 1;
}

.msg-image:hover {
  cursor: pointer;
}

.img-download {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  text-decoration: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.msg-image-container:hover .img-download {
  opacity: 1;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

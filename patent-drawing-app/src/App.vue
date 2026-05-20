<script setup lang="ts">
import { ref, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import MessageBubble from './components/MessageBubble.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { generateImage, refinePromptWithHistory } from './api/client'
import type { ChatMessage, Conversation } from './api/types'

// ===================== Constants =====================
const DEFAULT_IMAGE_MODEL = 'Qwen/Qwen-Image-2512'
const DEFAULT_CHAT_MODEL = 'Qwen/Qwen2.5-72B-Instruct'

// ===================== State =====================
const conversations = ref<Conversation[]>([])
const activeConvId = ref('')
const input = ref('')
const sidebarCollapsed = ref(false)
const showSettings = ref(false)
const imageModel = ref(DEFAULT_IMAGE_MODEL)
const chatModel = ref(DEFAULT_CHAT_MODEL)
const isGenerating = ref(false)
const abortController = ref<AbortController | null>(null)

const activeConv = computed(() =>
  conversations.value.find((c) => c.id === activeConvId.value)
)

// ===================== Helpers =====================
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ===================== Actions =====================
function createNewChat() {
  const id = uid()
  const conv: Conversation = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
  }
  conversations.value.unshift(conv)
  activeConvId.value = id
}

function deleteConversation(id: string) {
  conversations.value = conversations.value.filter((c) => c.id !== id)
  if (activeConvId.value === id) {
    activeConvId.value = conversations.value.length > 0 ? conversations.value[0].id : ''
    if (!activeConvId.value) createNewChat()
  }
}

function updateConversation(convId: string, updater: (c: Conversation) => Conversation) {
  const idx = conversations.value.findIndex((c) => c.id === convId)
  if (idx !== -1) {
    conversations.value[idx] = updater(conversations.value[idx])
  }
}

async function handleSend() {
  const text = input.value.trim()
  if (!text || isGenerating.value) return
  if (!activeConvId.value) return

  const userMsg: ChatMessage = {
    id: uid(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
  }

  const assistantMsg: ChatMessage = {
    id: uid(),
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    loading: true,
  }

  // Add user message
  updateConversation(activeConvId.value, (c) => {
    const msgs = [...c.messages, userMsg]
    return {
      ...c,
      messages: msgs,
      title: msgs.length <= 2 ? text.slice(0, 30) : c.title,
    }
  })

  input.value = ''
  isGenerating.value = true

  // Add assistant placeholder
  updateConversation(activeConvId.value, (c) => ({
    ...c,
    messages: [...c.messages, { ...assistantMsg, statusText: 'Preparing prompt...' }],
  }))

  const ac = new AbortController()
  abortController.value = ac

  try {
    const conv = conversations.value.find((c) => c.id === activeConvId.value)
    const history =
      conv?.messages.map((m) => ({ role: m.role, content: m.content })) || []
    history.push({ role: 'user', content: text })

    // Step 1: Refine prompt with chat model
    let refinedPrompt = text
    if (history.length > 1) {
      refinedPrompt = await refinePromptWithHistory(history, ac.signal)
    }

    // Update assistant message
    updateConversation(activeConvId.value, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === assistantMsg.id
          ? {
              ...m,
              content:
                refinedPrompt !== text
                  ? `Prompt: ${refinedPrompt}`
                  : 'Generating...',
              statusText: 'Submitting image task...',
            }
          : m
      ),
    }))

    // Step 2: Generate image
    const updateStatus = (status: string) => {
      updateConversation(activeConvId.value, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, statusText: status } : m
        ),
      }))
    }

    const imageUrl = await generateImage(
      refinedPrompt,
      imageModel.value,
      updateStatus,
      ac.signal
    )

    // Update with image
    updateConversation(activeConvId.value, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === assistantMsg.id
          ? {
              ...m,
              imageUrl,
              loading: false,
              content:
                refinedPrompt !== text
                  ? `Refined prompt: "${refinedPrompt}"`
                  : `Generated from: "${text}"`,
            }
          : m
      ),
    }))
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    if (errorMsg !== 'The user aborted a request.') {
      updateConversation(activeConvId.value, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, loading: false, error: errorMsg, content: 'Generation failed' }
            : m
        ),
      }))
    }
  } finally {
    isGenerating.value = false
    abortController.value = null
  }
}

function handleStop() {
  abortController.value?.abort()
  isGenerating.value = false
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const examplePrompts = [
  'A majestic dragon flying over a medieval castle at sunset',
  '一只穿着宇航服的猫在月球上漫步',
  'Cyberpunk cityscape with neon lights and rain',
  'Watercolor painting of cherry blossoms by a lake',
]

// Initialize with one conversation
createNewChat()
</script>

<template>
  <div class="app">
    <Sidebar
      :conversations="conversations"
      :activeId="activeConvId"
      :collapsed="sidebarCollapsed"
      @select="activeConvId = $event"
      @new-chat="createNewChat"
      @delete="deleteConversation"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
    />

    <main class="main">
      <header class="main-header">
        <div class="header-left">
          <h2 class="header-title">
            {{ activeConv?.title || 'New Chat' }}
          </h2>
          <span class="header-badge">ModelScope API</span>
        </div>
        <div class="header-right">
          <button class="btn-icon" title="Settings" @click="showSettings = true">
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
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
          </button>
        </div>
      </header>

      <div class="chat-area" ref="chatArea">
        <div v-if="!activeConv || activeConv.messages.length === 0" class="empty-state">
          <div class="empty-icon">🎨</div>
          <h2>Text to Image Generator</h2>
          <p>Describe the image you want to create, and AI will generate it for you.</p>
          <p class="empty-hint">Supports multi-turn conversation to refine images iteratively.</p>
          <div class="empty-examples">
            <button
              v-for="ex in examplePrompts"
              :key="ex"
              class="example-chip"
              @click="input = ex"
            >
              {{ ex }}
            </button>
          </div>
        </div>

        <MessageBubble
          v-for="msg in activeConv?.messages || []"
          :key="msg.id"
          :msg="msg"
          :formatTime="formatTime"
        />

        <div ref="chatEnd" />
      </div>

      <div class="input-area">
        <div class="input-container">
          <textarea
            ref="inputRef"
            class="input-textarea"
            v-model="input"
            @keydown="handleKeyDown"
            placeholder="Describe the image you want to generate... (Enter to send, Shift+Enter for new line)"
            :rows="1"
            :disabled="isGenerating"
          />
          <button
            v-if="isGenerating"
            class="btn-send btn-stop"
            title="Stop"
            @click="handleStop"
          >
            <span class="stop-icon">■</span>
          </button>
          <button
            v-else
            class="btn-send"
            :disabled="!input.trim()"
            title="Generate"
            @click="handleSend"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div class="input-footer">
          <span>Powered by ModelScope API · {{ imageModel }}</span>
          <span class="input-hint">Multi-turn: reference previous images to refine</span>
        </div>
      </div>
    </main>

    <SettingsPanel
      v-if="showSettings"
      :imageModel="imageModel"
      :chatModel="chatModel"
      @update:imageModel="imageModel = $event"
      @update:chatModel="chatModel = $event"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
/* App layout */
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-main);
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: var(--header-height);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.header-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* Chat Area */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
  scroll-behavior: smooth;
}

.chat-area::-webkit-scrollbar {
  width: 6px;
}

.chat-area::-webkit-scrollbar-track {
  background: transparent;
}

.chat-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--text);
}

.empty-state p {
  font-size: 15px;
  color: var(--text-muted);
  max-width: 480px;
  line-height: 1.6;
}

.empty-hint {
  margin-top: 4px;
  font-size: 13px !important;
  color: var(--text-dim) !important;
}

.empty-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
  justify-content: center;
  max-width: 640px;
}

.example-chip {
  padding: 8px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.example-chip:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--border-light);
}

/* Input Area */
.input-area {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-main);
}

.input-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 8px 8px 8px 18px;
  transition: border-color 0.2s;
}

.input-container:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.input-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  min-height: 24px;
  max-height: 120px;
  font-family: inherit;
}

.input-textarea::placeholder {
  color: var(--text-dim);
}

.input-textarea:disabled {
  opacity: 0.6;
}

.btn-send {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--accent);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-stop {
  background: var(--error);
}

.btn-stop:hover {
  background: #c53030 !important;
}

.stop-icon {
  font-size: 12px;
}

.input-footer {
  max-width: 900px;
  margin: 8px auto 0;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-dim);
}

.input-hint {
  color: var(--text-dim);
}

@media (max-width: 768px) {
  .empty-examples {
    flex-direction: column;
    align-items: center;
  }

  .example-chip {
    width: 100%;
    text-align: center;
  }
}
</style>

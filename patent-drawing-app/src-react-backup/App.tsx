import { useState, useRef, useEffect, useCallback } from 'react'
import { generateImage, refinePromptWithHistory } from './api/client'
import type { ChatMessage, Conversation } from './api/types'

// ===================== Default Config =====================
const DEFAULT_IMAGE_MODEL = 'Qwen/Qwen-Image-2512'
const DEFAULT_CHAT_MODEL = 'Qwen/Qwen2.5-72B-Instruct'

// ===================== Helpers =====================
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// ===================== Icon Components =====================
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ===================== Message Bubble =====================
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`msg-row ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className={`msg-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-role">{isUser ? 'You' : 'AI'}</span>
          <span className="msg-time">{formatTime(msg.timestamp)}</span>
        </div>
        <div className="msg-content">
          <p>{msg.content}</p>
        </div>
        {msg.loading && (
          <div className="msg-loading">
            <SpinnerIcon />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Generating image...</span>
              {msg.statusText && <span className="status-text">{msg.statusText}</span>}
            </div>
          </div>
        )}
        {msg.error && (
          <div className="msg-error">
            <span>{msg.error}</span>
          </div>
        )}
        {msg.imageUrl && !msg.loading && (
          <div className="msg-image-container">
            {!imgLoaded && !imgError && (
              <div className="img-placeholder">
                <ImageIcon />
              </div>
            )}
            {imgError && (
              <div className="img-placeholder img-error-placeholder">
                <span>Failed to load image</span>
              </div>
            )}
            <img
              src={msg.imageUrl}
              alt={msg.content}
              className={`msg-image ${imgLoaded ? 'loaded' : ''}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              onClick={() => window.open(msg.imageUrl, '_blank')}
            />
            {imgLoaded && (
              <a
                className="img-download"
                href={msg.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
              >
                ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===================== Sidebar =====================
function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  collapsed,
  onToggle,
}: {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">{collapsed ? '🎨' : '🎨 Text2Image'}</h1>
        <button className="btn-icon" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <button className="btn-new-chat" onClick={onNew}>
        <PlusIcon />
        {!collapsed && <span>New Chat</span>}
      </button>
      <div className="sidebar-list">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`sidebar-item ${c.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            {!collapsed && (
              <>
                <span className="sidebar-item-title">{c.title}</span>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(c.id)
                  }}
                >
                  <TrashIcon />
                </button>
              </>
            )}
            {collapsed && <span className="sidebar-item-dot" />}
          </div>
        ))}
      </div>
    </aside>
  )
}

// ===================== Settings Panel =====================
function SettingsPanel({
  imageModel,
  chatModel,
  onImageModelChange,
  onChatModelChange,
  onClose,
}: {
  imageModel: string
  chatModel: string
  onImageModelChange: (v: string) => void
  onChatModelChange: (v: string) => void
  onClose: () => void
}) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="settings-group">
          <label>Image Generation Model</label>
          <input
            type="text"
            value={imageModel}
            onChange={(e) => onImageModelChange(e.target.value)}
            placeholder="e.g. Qwen/Qwen-Image-2512"
          />
          <span className="settings-hint">Model ID from ModelScope that supports image generation</span>
        </div>
        <div className="settings-group">
          <label>Chat Model (for prompt refinement)</label>
          <input
            type="text"
            value={chatModel}
            onChange={(e) => onChatModelChange(e.target.value)}
            placeholder="e.g. Qwen/Qwen2.5-72B-Instruct"
          />
          <span className="settings-hint">Used to refine prompts with conversation context</span>
        </div>
        <div className="settings-group">
          <label>API Proxy</label>
          <input type="text" value="/api (Vite Proxy → FastAPI Backend)" disabled />
          <span className="settings-hint">Requests are proxied to local FastAPI backend via Vite dev server</span>
        </div>
        <button className="btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

// ===================== Main App =====================
export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string>('')
  const [input, setInput] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [imageModel, setImageModel] = useState(DEFAULT_IMAGE_MODEL)
  const [chatModel, setChatModel] = useState(DEFAULT_CHAT_MODEL)
  const [isGenerating, setIsGenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find((c) => c.id === activeConvId)

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages])

  // Create new conversation
  const createNewChat = useCallback(() => {
    const id = uid()
    const conv: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    }
    setConversations((prev) => [conv, ...prev])
    setActiveConvId(id)
    inputRef.current?.focus()
  }, [])

  // Initialize with one conversation
  useEffect(() => {
    if (conversations.length === 0) {
      createNewChat()
    }
  }, [])

  // Delete conversation
  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (activeConvId === id && next.length > 0) {
          setActiveConvId(next[0].id)
        } else if (next.length === 0) {
          createNewChat()
        }
        return next
      })
    },
    [activeConvId, createNewChat]
  )

  // Update conversation
  const updateConv = useCallback((convId: string, updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === convId ? updater(c) : c)))
  }, [])

  // Send message & generate image
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isGenerating) return

    const convId = activeConvId
    if (!convId) return

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
      imageUrl: undefined,
      timestamp: Date.now(),
      loading: true,
    }

    // Add user message
    updateConv(convId, (c) => {
      const msgs = [...c.messages, userMsg]
      return {
        ...c,
        messages: msgs,
        title: msgs.length <= 2 ? text.slice(0, 30) : c.title,
      }
    })

    setInput('')
    setIsGenerating(true)

    // Add assistant placeholder
    const assistantId = assistantMsg.id
    updateConv(convId, (c) => ({
      ...c,
      messages: [...c.messages, { ...assistantMsg, statusText: 'Preparing prompt...' }],
    }))

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      // Get conversation history for context
      const conv = conversations.find((c) => c.id === convId)
      const history = conv?.messages.map((m) => ({ role: m.role, content: m.content })) || []
      history.push({ role: 'user', content: text })

      // Step 1: Refine prompt with chat model (using conversation history)
      let refinedPrompt = text
      try {
        if (history.length > 1) {
          refinedPrompt = await refinePromptWithHistory(history, abortController.signal)
        }
      } catch {
        // Fallback to original prompt if chat model fails
        refinedPrompt = text
      }

      // Update assistant message with refined prompt
      updateConv(convId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantId ? { ...m, content: refinedPrompt !== text ? `Prompt: ${refinedPrompt}` : 'Generating...', statusText: 'Submitting image task...' } : m
        ),
      }))

      // Step 2: Generate image (async: submit + poll)
      // Update status during polling via a callback approach
      const updateStatus = (status: string) => {
        updateConv(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId ? { ...m, statusText: status } : m
          ),
        }))
      }

      const imageUrl = await generateImage(refinedPrompt, imageModel, updateStatus, abortController.signal)

      // Update with image
      updateConv(convId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? { ...m, imageUrl, loading: false, content: refinedPrompt !== text ? `Refined prompt: "${refinedPrompt}"` : `Generated from: "${text}"` }
            : m
        ),
      }))
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      if (errorMsg !== 'The user aborted a request.') {
        updateConv(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId ? { ...m, loading: false, error: errorMsg, content: 'Generation failed' } : m
          ),
        }))
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [input, isGenerating, activeConvId, conversations, updateConv])

  // Stop generation
  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsGenerating(false)
  }, [])

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        onNew={createNewChat}
        onDelete={deleteConversation}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="main">
        <header className="main-header">
          <div className="header-left">
            <h2 className="header-title">
              {activeConv?.title || 'New Chat'}
            </h2>
            <span className="header-badge">ModelScope API</span>
          </div>
          <div className="header-right">
            <button className="btn-icon" onClick={() => setShowSettings(true)} title="Settings">
              <SettingsIcon />
            </button>
          </div>
        </header>

        <div className="chat-area">
          {(!activeConv || activeConv.messages.length === 0) && (
            <div className="empty-state">
              <div className="empty-icon">🎨</div>
              <h2>Text to Image Generator</h2>
              <p>Describe the image you want to create, and AI will generate it for you.</p>
              <p className="empty-hint">Supports multi-turn conversation to refine images iteratively.</p>
              <div className="empty-examples">
                {[
                  'A majestic dragon flying over a medieval castle at sunset',
                  '一只穿着宇航服的猫在月球上漫步',
                  'Cyberpunk cityscape with neon lights and rain',
                  'Watercolor painting of cherry blossoms by a lake',
                ].map((ex) => (
                  <button
                    key={ex}
                    className="example-chip"
                    onClick={() => {
                      setInput(ex)
                      inputRef.current?.focus()
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeConv?.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={inputRef}
              className="input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to generate... (Enter to send, Shift+Enter for new line)"
              rows={1}
              disabled={isGenerating}
            />
            {isGenerating ? (
              <button className="btn-send btn-stop" onClick={handleStop} title="Stop">
                <span className="stop-icon">■</span>
              </button>
            ) : (
              <button
                className="btn-send"
                onClick={handleSend}
                disabled={!input.trim()}
                title="Generate"
              >
                <SendIcon />
              </button>
            )}
          </div>
          <div className="input-footer">
            <span>Powered by ModelScope API · {imageModel}</span>
            <span className="input-hint">Multi-turn: reference previous images to refine</span>
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsPanel
          imageModel={imageModel}
          chatModel={chatModel}
          onImageModelChange={setImageModel}
          onChatModelChange={setChatModel}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

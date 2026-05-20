/**
 * API type definitions for ModelScope Text-to-Image Proxy
 */

// ==================== Request Types ====================

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  loras?: Record<string, number>;
}

export interface PromptRefineRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
}

// ==================== Response Types ====================

export interface TaskSubmitResponse {
  task_id: string | null;
  direct_url?: string;
}

export interface TaskStatusResponse {
  task_id: string;
  task_status: 'PENDING' | 'RUNNING' | 'SUCCEED' | 'FAILED' | 'UNKNOWN';
  output_images?: string[];
  error?: string;
}

export interface PromptRefineResponse {
  refined_prompt: string;
}

export interface HealthResponse {
  status: string;
  base_url: string;
}

// ==================== App-Level Types ====================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
  loading?: boolean;
  statusText?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

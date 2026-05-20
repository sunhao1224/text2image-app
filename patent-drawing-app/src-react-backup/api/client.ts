/**
 * API client using axios to communicate with the FastAPI backend proxy.
 * All requests go to the local backend (via Vite proxy in dev mode).
 */

import axios from 'axios';
import type {
  ImageGenerationRequest,
  TaskSubmitResponse,
  TaskStatusResponse,
  PromptRefineRequest,
  PromptRefineResponse,
  HealthResponse,
} from './types';

// Base URL: use relative path (Vite dev proxy handles it)
// In production, set to your backend URL
const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== API Methods ====================

/**
 * Check backend health.
 */
export async function healthCheck(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
}

/**
 * Submit an async image generation task.
 * Returns a task_id for polling.
 */
export async function submitImageTask(
  request: ImageGenerationRequest
): Promise<TaskSubmitResponse> {
  const { data } = await api.post<TaskSubmitResponse>('/generate', request);
  return data;
}

/**
 * Poll the status of an image generation task.
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const { data } = await api.get<TaskStatusResponse>(`/tasks/${taskId}`);
  return data;
}

/**
 * Use chat model to refine image prompt based on conversation history.
 */
export async function refinePrompt(
  request: PromptRefineRequest
): Promise<PromptRefineResponse> {
  const { data } = await api.post<PromptRefineResponse>('/refine-prompt', request);
  return data;
}

/**
 * Full image generation flow: submit → poll → return image URL.
 * Handles the async task lifecycle with progress callbacks.
 */
export async function generateImage(
  prompt: string,
  imageModel: string,
  onStatus: (status: string) => void,
  signal?: AbortSignal
): Promise<string> {
  onStatus('Submitting image task...');

  // Step 1: Submit task
  const submitResponse = await submitImageTask({
    prompt,
    model: imageModel,
  });

  // If backend returns direct URL (sync mode)
  if (submitResponse.direct_url) {
    onStatus('Image ready!');
    return submitResponse.direct_url;
  }

  const taskId = submitResponse.task_id;
  if (!taskId) {
    throw new Error('No task_id returned from backend');
  }

  onStatus(`Task submitted (id: ${taskId.slice(0, 8)}...), generating...`);

  // Step 2: Poll until done
  const POLL_INTERVAL = 2000;
  const MAX_POLL_TIME = 120000;
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    if (signal?.aborted) throw new Error('The user aborted a request.');

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    pollCount++;

    const status = await getTaskStatus(taskId);

    if (status.task_status === 'SUCCEED') {
      onStatus('Image ready!');
      const imageUrl = status.output_images?.[0];
      if (!imageUrl) throw new Error('Task succeeded but no output_images found');
      return imageUrl;
    }

    if (status.task_status === 'FAILED') {
      throw new Error(status.error || 'Image generation task failed on server side');
    }

    onStatus(`Generating... (poll #${pollCount}, status: ${status.task_status || 'pending'})`);
  }

  throw new Error('Image generation timed out (2 minutes)');
}

/**
 * Refine image prompt using chat model with conversation history.
 */
export async function refinePromptWithHistory(
  _messages: Array<{ role: string; content: string }>,
  _signal?: AbortSignal
): Promise<string> {
  try {
    const response = await refinePrompt({ messages: _messages });
    return response.refined_prompt;
  } catch {
    // Fallback: use last user message
    return _messages[_messages.length - 1]?.content || '';
  }
}

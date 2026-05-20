"""
ModelScope Text-to-Image API Proxy Service
FastAPI backend that proxies requests to ModelScope API.
"""

import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("MODELSCOPE_API_KEY", "")
BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn").rstrip("/")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "Qwen/Qwen-Image-2512")
CHAT_MODEL = os.getenv("CHAT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

if not API_KEY:
    raise RuntimeError("MODELSCOPE_API_KEY environment variable is required")

# FastAPI app
app = FastAPI(
    title="ModelScope Text-to-Image Proxy",
    description="Proxy service for ModelScope image generation API",
    version="1.0.0",
)

# CORS middleware - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP client for ModelScope API
http_client = httpx.AsyncClient(
    base_url=BASE_URL,
    timeout=httpx.Timeout(120.0, connect=30.0),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    },
)


# ==================== Request/Response Models ====================

class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    loras: Optional[dict] = None


class TaskStatusResponse(BaseModel):
    task_id: str
    task_status: str
    output_images: Optional[list[str]] = None
    error: Optional[str] = None


class PromptRefineRequest(BaseModel):
    messages: list[dict[str, str]]
    model: Optional[str] = None


class PromptRefineResponse(BaseModel):
    refined_prompt: str


# ==================== API Endpoints ====================

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "base_url": BASE_URL}


@app.post("/api/generate")
async def submit_image_task(request: ImageGenerationRequest):
    """
    Submit an async image generation task to ModelScope.
    Returns a task_id for polling.
    """
    model = request.model or IMAGE_MODEL
    body = {
        "model": model,
        "prompt": request.prompt,
    }
    if request.loras:
        body["loras"] = request.loras

    try:
        response = await http_client.post(
            "/v1/images/generations",
            headers={"X-ModelScope-Async-Mode": "true"},
            json=body,
        )
        response.raise_for_status()
        data = response.json()

        if "task_id" in data:
            return {"task_id": data["task_id"]}
        # Fallback: synchronous response
        if "data" in data and data["data"]:
            return {"task_id": None, "direct_url": data["data"][0].get("url")}
        raise HTTPException(status_code=500, detail="No task_id in response")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")


@app.get("/api/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Poll the status of an image generation task.
    """
    try:
        response = await http_client.get(
            f"/v1/tasks/{task_id}",
            headers={"X-ModelScope-Task-Type": "image_generation"},
        )
        response.raise_for_status()
        data = response.json()

        return TaskStatusResponse(
            task_id=task_id,
            task_status=data.get("task_status", "UNKNOWN"),
            output_images=data.get("output_images"),
            error=data.get("error"),
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")


@app.post("/api/refine-prompt", response_model=PromptRefineResponse)
async def refine_prompt(request: PromptRefineRequest):
    """
    Use chat model to refine image prompt based on conversation history.
    """
    model = request.model or CHAT_MODEL

    system_msg = {
        "role": "system",
        "content": (
            "You are an image prompt engineer. Based on the conversation history, "
            "generate a detailed image generation prompt in English. "
            "If the user refers to previous images or makes modifications, incorporate that context. "
            "Output ONLY the image prompt, nothing else. Be descriptive and specific."
        ),
    }
    # Keep last 6 messages for context
    chat_messages = [system_msg] + request.messages[-7:]

    try:
        response = await http_client.post(
            "/v1/chat/completions",
            json={
                "model": model,
                "messages": chat_messages,
                "max_tokens": 256,
                "temperature": 0.7,
            },
        )
        response.raise_for_status()
        data = response.json()
        refined = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        if not refined:
            # Fallback to last user message
            user_messages = [m for m in request.messages if m.get("role") == "user"]
            refined = user_messages[-1].get("content", "") if user_messages else ""

        return PromptRefineResponse(refined_prompt=refined)
    except httpx.HTTPStatusError:
        # Fallback: use last user message
        user_messages = [m for m in request.messages if m.get("role") == "user"]
        fallback = user_messages[-1].get("content", "") if user_messages else ""
        return PromptRefineResponse(refined_prompt=fallback)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    await http_client.aclose()

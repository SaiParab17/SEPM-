# ============================================================
# KAGGLE NOTEBOOK — Video QA FastAPI Endpoint
# Copy each cell into your Kaggle notebook in order
# ============================================================

# ─── CELL 1: Environment & Ngrok Setup ───────────────────────
"""
import os
os.environ["HF_TOKEN"] = "hf_YOUR_TOKEN_HERE"  # Replace with your HuggingFace token

# Install ngrok
!curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
!echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | tee /etc/apt/sources.list.d/ngrok.list
!apt update -qq
!apt install ngrok -y -qq

# Auth ngrok
!ngrok config add-authtoken YOUR_NGROK_TOKEN_HERE  # Get from: https://dashboard.ngrok.com/authtokens
"""

# ─── CELL 2: Install Python Dependencies ─────────────────────
"""
!pip install -q transformers accelerate bitsandbytes decord opencv-python fastapi uvicorn python-multipart pyngrok
"""

# ─── CELL 3: Load Model ──────────────────────────────────────
"""
import cv2
import torch
import numpy as np
from transformers import AutoProcessor, LlavaNextVideoForConditionalGeneration, BitsAndBytesConfig

model_id = "llava-hf/LLaVA-NeXT-Video-7B-hf"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

processor = AutoProcessor.from_pretrained(model_id)
model = LlavaNextVideoForConditionalGeneration.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto"
)

print("✅ Model loaded successfully!")
"""

# ─── CELL 4: FastAPI Server + Ngrok Tunnel (Enhanced) ─────────
"""
import subprocess
subprocess.run("kill -9 $(lsof -t -i:8000) 2>/dev/null || true", shell=True)

import os
import cv2
import torch
import numpy as np
import tempfile
import time
import threading
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pyngrok import ngrok

# ================================================================
#  FRAME EXTRACTION STRATEGIES
# ================================================================

def get_video_info(video_path):
    """Get basic video metadata."""
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration = total_frames / fps if fps > 0 else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return {
        "total_frames": total_frames,
        "fps": fps,
        "duration_seconds": round(duration, 2),
        "width": width,
        "height": height,
    }

def extract_uniform(video_path, num_frames=32):
    """Simple uniform sampling — evenly spaced across the video."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return []
    indices = np.linspace(0, total - 1, num_frames, dtype=int)
    frames = []
    for i in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if ret:
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    cap.release()
    return frames

def extract_keyframes(video_path, max_frames=32, threshold=30.0):
    """
    Scene-change-aware extraction.
    1. Compute frame-to-frame difference for every frame.
    2. Pick the top-N frames with highest visual change (scene cuts, new actions).
    3. Fill remaining slots uniformly so no long gap goes unrepresented.
    """
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return []

    # --- Pass 1: compute difference scores (downscaled for speed) ---
    scores = []
    prev_gray = None
    sample_step = max(1, total // 500)  # sample up to ~500 points for speed

    for idx in range(0, total, sample_step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        small = cv2.resize(frame, (160, 90))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev_gray is not None:
            diff = np.mean(np.abs(gray - prev_gray))
            scores.append((idx, diff))
        prev_gray = gray

    # --- Pass 2: select keyframes ---
    # Take top scene-change frames
    scores.sort(key=lambda x: x[1], reverse=True)
    keyframe_indices = set()
    for idx, score in scores:
        if score >= threshold:
            keyframe_indices.add(idx)
        if len(keyframe_indices) >= max_frames // 2:
            break

    # Fill remaining slots uniformly so we cover the whole timeline
    remaining = max_frames - len(keyframe_indices)
    if remaining > 0:
        uniform = np.linspace(0, total - 1, remaining + 2, dtype=int)[1:-1]
        for idx in uniform:
            keyframe_indices.add(int(idx))

    # Sort chronologically and cap at max_frames
    sorted_indices = sorted(keyframe_indices)[:max_frames]

    # --- Pass 3: read selected frames ---
    frames = []
    for i in sorted_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if ret:
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

    cap.release()
    return frames

def extract_dense_segments(video_path, frames_per_segment=32, overlap_frames=4):
    """
    For thorough coverage: split the video into overlapping segments,
    extract frames from each. Returns list of frame-lists (one per segment).
    """
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return []

    segments = []
    step = max(1, frames_per_segment - overlap_frames)
    seg_starts = list(range(0, total, int(total / max(1, total // (step * frames_per_segment)) ) ))

    # Compute actual segment boundaries
    seg_boundaries = []
    pos = 0
    while pos < total:
        end = min(pos + int(total * frames_per_segment / max(total, 1)), total - 1)
        # For simplicity: uniformly sample frames_per_segment from [pos, end]
        end = min(pos + (total // max(1, (total // (step)))), total - 1)
        seg_boundaries.append((pos, min(pos + total // max(1, len(range(0, total, step))), total - 1)))
        pos += step
        if pos >= total:
            break

    # Simpler approach: just divide video into N chunks
    num_segments = max(1, total // (frames_per_segment * 10))  # ~1 segment per 10*32=320 frames
    num_segments = min(num_segments, 6)  # cap at 6 segments to avoid OOM

    if num_segments <= 1:
        # Short video — just extract all as one segment
        frames = extract_keyframes(video_path, max_frames=frames_per_segment)
        return [frames] if frames else []

    chunk_size = total // num_segments
    for seg_i in range(num_segments):
        start = seg_i * chunk_size
        end = start + chunk_size - 1 if seg_i < num_segments - 1 else total - 1
        indices = np.linspace(start, end, frames_per_segment, dtype=int)
        seg_frames = []
        for i in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                seg_frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        if seg_frames:
            segments.append(seg_frames)

    cap.release()
    return segments

def run_inference(frames, query, max_tokens=400):
    """Run LLaVA inference on a single set of frames."""
    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "video"},
                {"type": "text", "text": query}
            ],
        }
    ]
    prompt = processor.apply_chat_template(conversation, add_generation_prompt=True)
    inputs = processor(
        text=prompt,
        videos=frames,
        return_tensors="pt"
    ).to("cuda")

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=0.7,
            do_sample=True
        )

    answer = processor.decode(output[0], skip_special_tokens=True)
    if "ASSISTANT:" in answer:
        answer = answer.split("ASSISTANT:")[-1].strip()
    return answer

# ================================================================
#  FastAPI APP
# ================================================================

app = FastAPI(title="DocuMind Video QA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "model": "LLaVA-NeXT-Video-7B"}

@app.post("/api/video-qa")
async def video_qa(
    video: UploadFile = File(...),
    query: str = Form(...),
    quality: str = Form("balanced"),   # "fast" | "balanced" | "thorough"
):
    start_time = time.time()

    # Save uploaded video to temp file
    suffix = os.path.splitext(video.filename or ".mp4")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        info = get_video_info(tmp_path)
        total_frames_extracted = 0

        if info["total_frames"] == 0:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Could not read video"}
            )

        # ── FAST: 16 uniform frames, single pass ──
        if quality == "fast":
            frames = extract_uniform(tmp_path, num_frames=16)
            if not frames:
                return JSONResponse(status_code=400, content={"success": False, "error": "No frames extracted"})
            answer = run_inference(frames, query)
            total_frames_extracted = len(frames)

        # ── BALANCED: 32 keyframes, single pass ──
        elif quality == "balanced":
            frames = extract_keyframes(tmp_path, max_frames=32)
            if not frames:
                return JSONResponse(status_code=400, content={"success": False, "error": "No frames extracted"})
            answer = run_inference(frames, query)
            total_frames_extracted = len(frames)

        # ── THOROUGH: multi-segment dense processing ──
        elif quality == "thorough":
            segments = extract_dense_segments(tmp_path, frames_per_segment=32)
            if not segments:
                return JSONResponse(status_code=400, content={"success": False, "error": "No frames extracted"})

            if len(segments) == 1:
                answer = run_inference(segments[0], query)
                total_frames_extracted = len(segments[0])
            else:
                # Process each segment separately
                segment_answers = []
                for i, seg_frames in enumerate(segments):
                    seg_query = f"{query}\\n\\n[Note: This is segment {i+1} of {len(segments)} from the video. Describe what you observe in this part.]"
                    seg_answer = run_inference(seg_frames, seg_query, max_tokens=250)
                    segment_answers.append(f"[Segment {i+1}/{len(segments)}]: {seg_answer}")
                    total_frames_extracted += len(seg_frames)

                # Final synthesis pass — combine segment answers
                combined_context = "\\n\\n".join(segment_answers)
                synthesis_prompt = (
                    f"I analyzed a video in {len(segments)} segments. Here are the observations from each segment:\\n\\n"
                    f"{combined_context}\\n\\n"
                    f"Based on ALL segments above, provide a comprehensive answer to the original question: {query}"
                )

                # Use text-only synthesis (no video frames needed)
                synth_conversation = [{"role": "user", "content": [{"type": "text", "text": synthesis_prompt}]}]
                synth_prompt = processor.apply_chat_template(synth_conversation, add_generation_prompt=True)
                synth_inputs = processor(text=synth_prompt, return_tensors="pt").to("cuda")

                with torch.no_grad():
                    synth_output = model.generate(**synth_inputs, max_new_tokens=500, temperature=0.5, do_sample=True)

                answer = processor.decode(synth_output[0], skip_special_tokens=True)
                if "ASSISTANT:" in answer:
                    answer = answer.split("ASSISTANT:")[-1].strip()
        else:
            # Default to balanced
            frames = extract_keyframes(tmp_path, max_frames=32)
            answer = run_inference(frames, query)
            total_frames_extracted = len(frames)

        elapsed = round(time.time() - start_time, 2)

        return {
            "success": True,
            "answer": answer,
            "frames_extracted": total_frames_extracted,
            "response_time": elapsed,
            "model": "LLaVA-NeXT-Video-7B",
            "quality": quality,
            "video_duration": info["duration_seconds"],
            "video_resolution": f"{info['width']}x{info['height']}",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
    finally:
        os.unlink(tmp_path)

# ---------- Start server + ngrok ----------
ngrok.kill()

public_url = ngrok.connect(8000)
print(f"\\n{'='*60}")
print(f"🚀 PUBLIC URL: {public_url}")
print(f"{'='*60}")
print(f"\\n👉 Copy this URL into your frontend .env file as:")
print(f"   VITE_VIDEO_QA_URL={public_url}")
print(f"\\n📡 Endpoints:")
print(f"   GET  {public_url}/health")
print(f"   POST {public_url}/api/video-qa")
print(f"\\n📊 Quality modes:")
print(f"   fast       → 16 uniform frames, ~10s")
print(f"   balanced   → 32 keyframes (scene-change aware), ~20s")
print(f"   thorough   → multi-segment dense analysis, ~45-90s")
print(f"{'='*60}\\n")

def run():
    uvicorn.run(app, host="0.0.0.0", port=8000)

thread = threading.Thread(target=run, daemon=True)
thread.start()

print("✅ Server is running! Keep this cell alive.")
"""

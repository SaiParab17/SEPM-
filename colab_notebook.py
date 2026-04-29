# ============================================================
# GOOGLE COLAB / KAGGLE NOTEBOOK — Video + Audio QA
# Copy each cell into your notebook in order
# ============================================================

# ─── CELL 1: Environment & Ngrok Setup ───────────────────────
"""
import os
os.environ["HF_TOKEN"] = "hf_YOUR_TOKEN_HERE"  # Replace with your HuggingFace token

# Install ngrok
!curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
!echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | tee /etc/apt/sources.list.d/ngrok.list
!apt update -qq
!apt install ngrok ffmpeg -y -qq

# Auth ngrok
!ngrok config add-authtoken YOUR_NGROK_TOKEN_HERE  # Get from: https://dashboard.ngrok.com/authtokens
"""

# ─── CELL 2: Install Python Dependencies ─────────────────────
"""
!pip install -q transformers accelerate bitsandbytes decord opencv-python fastapi uvicorn python-multipart pyngrok librosa soundfile
"""

# ─── CELL 3: Load BOTH Models (LLaVA + Whisper) ──────────────
"""
import cv2
import torch
import numpy as np
from transformers import (
    AutoProcessor,
    LlavaNextVideoForConditionalGeneration,
    BitsAndBytesConfig,
    WhisperProcessor,
    WhisperForConditionalGeneration,
)

# ── 3a: Load LLaVA-NeXT-Video-7B (4-bit) ──
llava_id = "llava-hf/LLaVA-NeXT-Video-7B-hf"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

llava_processor = AutoProcessor.from_pretrained(llava_id)
llava_model = LlavaNextVideoForConditionalGeneration.from_pretrained(
    llava_id,
    quantization_config=bnb_config,
    device_map="auto"
)
print("✅ LLaVA-NeXT-Video-7B loaded")

# ── 3b: Load Whisper-large-v3 (fp16 to save VRAM) ──
whisper_id = "openai/whisper-large-v3"

whisper_processor = WhisperProcessor.from_pretrained(whisper_id)
whisper_model = WhisperForConditionalGeneration.from_pretrained(
    whisper_id,
    torch_dtype=torch.float16,
    device_map="auto"
)
whisper_model.config.forced_decoder_ids = None
print("✅ Whisper-large-v3 loaded")
print(f"🎯 Total GPU memory used: {torch.cuda.memory_allocated() / 1024**3:.1f} GB")
"""

# ─── CELL 4: FastAPI Server + Ngrok Tunnel ────────────────────
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
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import uvicorn
from pyngrok import ngrok

# ================================================================
#  AUDIO EXTRACTION & TRANSCRIPTION
# ================================================================

def extract_audio_from_video(video_path):
    """Extract audio track from a video file using ffmpeg → WAV."""
    audio_path = video_path + ".audio.wav"
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le",
         "-ar", "16000", "-ac", "1", audio_path],
        capture_output=True, text=True
    )
    if result.returncode != 0 or not os.path.exists(audio_path):
        return None
    # Check if audio file has actual content
    info = sf.info(audio_path)
    if info.duration < 0.5:
        os.unlink(audio_path)
        return None
    return audio_path

def transcribe_audio(audio_path, max_chunk_seconds=30):
    """
    Transcribe audio using Whisper-large-v3.
    Processes in 30-second chunks to handle long files.
    Returns full transcript string.
    """
    audio, sr = librosa.load(audio_path, sr=16000)
    duration = len(audio) / sr
    chunk_size = max_chunk_seconds * sr
    chunks = [audio[i:i + chunk_size] for i in range(0, len(audio), chunk_size)]

    transcripts = []
    for i, chunk in enumerate(chunks):
        inputs = whisper_processor(
            chunk, sampling_rate=16000, return_tensors="pt"
        ).input_features.to("cuda", dtype=torch.float16)

        with torch.no_grad():
            predicted_ids = whisper_model.generate(
                inputs,
                max_new_tokens=444,
                language="en",
                task="transcribe"
            )

        text = whisper_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
        if text:
            transcripts.append(text)

    full_transcript = " ".join(transcripts)
    return full_transcript, round(duration, 2)

# ================================================================
#  FRAME EXTRACTION STRATEGIES (same as before)
# ================================================================

def get_video_info(video_path):
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
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return []
    scores = []
    prev_gray = None
    sample_step = max(1, total // 500)
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
    scores.sort(key=lambda x: x[1], reverse=True)
    keyframe_indices = set()
    for idx, score in scores:
        if score >= threshold:
            keyframe_indices.add(idx)
        if len(keyframe_indices) >= max_frames // 2:
            break
    remaining = max_frames - len(keyframe_indices)
    if remaining > 0:
        uniform = np.linspace(0, total - 1, remaining + 2, dtype=int)[1:-1]
        for idx in uniform:
            keyframe_indices.add(int(idx))
    sorted_indices = sorted(keyframe_indices)[:max_frames]
    frames = []
    for i in sorted_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if ret:
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    cap.release()
    return frames

def extract_dense_segments(video_path, frames_per_segment=32):
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return []
    num_segments = max(1, total // (frames_per_segment * 10))
    num_segments = min(num_segments, 6)
    if num_segments <= 1:
        frames = extract_keyframes(video_path, max_frames=frames_per_segment)
        return [frames] if frames else []
    chunk_size = total // num_segments
    segments = []
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

# ================================================================
#  LLaVA INFERENCE HELPERS
# ================================================================

def run_video_inference(frames, query, max_tokens=400):
    """Run LLaVA inference on video frames."""
    conversation = [
        {"role": "user", "content": [{"type": "video"}, {"type": "text", "text": query}]}
    ]
    prompt = llava_processor.apply_chat_template(conversation, add_generation_prompt=True)
    inputs = llava_processor(text=prompt, videos=frames, return_tensors="pt").to("cuda")
    with torch.no_grad():
        output = llava_model.generate(**inputs, max_new_tokens=max_tokens, temperature=0.7, do_sample=True)
    answer = llava_processor.decode(output[0], skip_special_tokens=True)
    if "ASSISTANT:" in answer:
        answer = answer.split("ASSISTANT:")[-1].strip()
    return answer

def run_text_inference(prompt_text, max_tokens=500):
    """Run LLaVA in text-only mode (for synthesis/summarization)."""
    conversation = [{"role": "user", "content": [{"type": "text", "text": prompt_text}]}]
    prompt = llava_processor.apply_chat_template(conversation, add_generation_prompt=True)
    inputs = llava_processor(text=prompt, return_tensors="pt").to("cuda")
    with torch.no_grad():
        output = llava_model.generate(**inputs, max_new_tokens=max_tokens, temperature=0.5, do_sample=True)
    answer = llava_processor.decode(output[0], skip_special_tokens=True)
    if "ASSISTANT:" in answer:
        answer = answer.split("ASSISTANT:")[-1].strip()
    return answer

def get_video_answer(video_path, query, quality):
    """Full video QA pipeline — returns (answer, frames_extracted)."""
    if quality == "fast":
        frames = extract_uniform(video_path, num_frames=16)
        if not frames:
            return None, 0
        return run_video_inference(frames, query), len(frames)

    elif quality == "balanced":
        frames = extract_keyframes(video_path, max_frames=32)
        if not frames:
            return None, 0
        return run_video_inference(frames, query), len(frames)

    elif quality == "thorough":
        segments = extract_dense_segments(video_path, frames_per_segment=32)
        if not segments:
            return None, 0
        if len(segments) == 1:
            return run_video_inference(segments[0], query), len(segments[0])
        segment_answers = []
        total_f = 0
        for i, seg_frames in enumerate(segments):
            seg_q = f"{query}\n\n[Note: This is segment {i+1} of {len(segments)} from the video.]"
            seg_a = run_video_inference(seg_frames, seg_q, max_tokens=250)
            segment_answers.append(f"[Segment {i+1}/{len(segments)}]: {seg_a}")
            total_f += len(seg_frames)
        combined = "\n\n".join(segment_answers)
        synthesis = (
            f"I analyzed a video in {len(segments)} segments:\n\n{combined}\n\n"
            f"Provide a comprehensive answer to: {query}"
        )
        return run_text_inference(synthesis), total_f

    else:
        frames = extract_keyframes(video_path, max_frames=32)
        if not frames:
            return None, 0
        return run_video_inference(frames, query), len(frames)

# ================================================================
#  FastAPI APP
# ================================================================

app = FastAPI(title="DocuMind Video + Audio QA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models": {
            "video": "LLaVA-NeXT-Video-7B",
            "audio": "Whisper-large-v3"
        }
    }

# ── 1) VIDEO QA (with optional audio) ────────────────────────
@app.post("/api/video-qa")
async def video_qa(
    video: UploadFile = File(...),
    query: str = Form(...),
    quality: str = Form("balanced"),
    include_audio: str = Form("false"),    # "true" | "false"
):
    start_time = time.time()

    suffix = os.path.splitext(video.filename or ".mp4")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    audio_path = None
    try:
        info = get_video_info(tmp_path)
        if info["total_frames"] == 0:
            return JSONResponse(status_code=400, content={"success": False, "error": "Could not read video"})

        # ── Step 1: Video analysis ──
        video_answer, frames_extracted = get_video_answer(tmp_path, query, quality)
        if video_answer is None:
            return JSONResponse(status_code=400, content={"success": False, "error": "No frames extracted"})

        audio_transcript = None
        audio_duration = None
        final_answer = video_answer

        # ── Step 2: Audio transcription (if toggled on) ──
        if include_audio.lower() == "true":
            audio_path = extract_audio_from_video(tmp_path)
            if audio_path:
                try:
                    audio_transcript, audio_duration = transcribe_audio(audio_path)
                except Exception as ae:
                    print(f"⚠️ Audio transcription failed: {ae}")
                    audio_transcript = None

        # ── Step 3: Combine video + audio into final answer ──
        if audio_transcript and len(audio_transcript.strip()) > 10:
            synthesis_prompt = (
                f"I have two sources of information about a video:\n\n"
                f"=== VISUAL ANALYSIS (from video frames) ===\n{video_answer}\n\n"
                f"=== AUDIO TRANSCRIPT (speech/narration from the video) ===\n{audio_transcript}\n\n"
                f"Based on BOTH the visual content and the audio/speech, provide a comprehensive, "
                f"unified answer to this question: {query}\n\n"
                f"Integrate both visual observations and spoken content naturally. "
                f"When the audio provides context that the visuals don't (like narration, dialogue, "
                f"or background info), include it. When visuals show things not mentioned in audio, "
                f"include those too."
            )
            final_answer = run_text_inference(synthesis_prompt, max_tokens=600)

        elapsed = round(time.time() - start_time, 2)

        return {
            "success": True,
            "answer": final_answer,
            "video_answer": video_answer,
            "audio_transcript": audio_transcript,
            "frames_extracted": frames_extracted,
            "response_time": elapsed,
            "model": "LLaVA-NeXT-Video-7B + Whisper-large-v3" if audio_transcript else "LLaVA-NeXT-Video-7B",
            "quality": quality,
            "include_audio": audio_transcript is not None,
            "audio_duration": audio_duration,
            "video_duration": info["duration_seconds"],
            "video_resolution": f"{info['width']}x{info['height']}",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        os.unlink(tmp_path)
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)

# ── 2) AUDIO-ONLY QA ─────────────────────────────────────────
@app.post("/api/audio-qa")
async def audio_qa(
    audio: UploadFile = File(...),
    query: str = Form(...),
):
    start_time = time.time()

    suffix = os.path.splitext(audio.filename or ".wav")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Convert to WAV 16kHz if not already
    wav_path = tmp_path + ".16k.wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", wav_path],
            capture_output=True, text=True, check=True
        )
    except Exception:
        wav_path = tmp_path  # try raw file if ffmpeg fails

    try:
        transcript, duration = transcribe_audio(wav_path)

        if not transcript or len(transcript.strip()) < 5:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No speech detected in audio file."}
            )

        # Use LLaVA text-only mode to answer based on transcript
        qa_prompt = (
            f"Below is a transcript of an audio recording:\n\n"
            f"=== TRANSCRIPT ===\n{transcript}\n=== END ===\n\n"
            f"Based on this transcript, answer the following question:\n{query}"
        )
        answer = run_text_inference(qa_prompt, max_tokens=500)

        elapsed = round(time.time() - start_time, 2)

        return {
            "success": True,
            "answer": answer,
            "transcript": transcript,
            "audio_duration": duration,
            "response_time": elapsed,
            "model": "Whisper-large-v3 + LLaVA-7B",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if os.path.exists(wav_path) and wav_path != tmp_path:
            os.unlink(wav_path)

# ---------- Start server + ngrok ----------
ngrok.kill()

public_url = ngrok.connect(8000)
print(f"\\n{'='*60}")
print(f"🚀 PUBLIC URL: {public_url}")
print(f"{'='*60}")
print(f"\\n👉 Copy this URL into your frontend Settings:")
print(f"   {public_url}")
print(f"\\n📡 Endpoints:")
print(f"   GET  {public_url}/health")
print(f"   POST {public_url}/api/video-qa     (video + optional audio)")
print(f"   POST {public_url}/api/audio-qa     (audio-only)")
print(f"\\n📊 Quality modes (video):")
print(f"   fast       → 16 uniform frames, ~10s")
print(f"   balanced   → 32 keyframes (scene-change aware), ~20s")
print(f"   thorough   → multi-segment dense analysis, ~45-90s")
print(f"\\n🎙️ Audio:")
print(f"   include_audio=true on /api/video-qa → extracts & transcribes audio track")
print(f"   /api/audio-qa → standalone audio file Q&A")
print(f"{'='*60}\\n")

def run():
    uvicorn.run(app, host="0.0.0.0", port=8000)

thread = threading.Thread(target=run, daemon=True)
thread.start()

print("✅ Server is running! Keep this cell alive.")
"""

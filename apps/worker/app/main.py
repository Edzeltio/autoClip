from fastapi import FastAPI, BackgroundTasks, HTTPException, Header, Depends
from pydantic import BaseModel
import os
from supabase import create_client
from app.ai.transcription import extract_transcript
from app.ai.clip_detector import analyze_and_extract_clips

app = FastAPI(title="ClipForge AI Processing Worker", version="1.0.0")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

WORKER_API_SECRET = os.getenv("WORKER_API_SECRET", "your-secure-worker-shared-secret")

class ProcessRequest(BaseModel):
    jobId: str
    projectId: str
    storagePath: str
    userId: str

def verify_secret(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    if token != WORKER_API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid authorization token")

def run_full_pipeline(job_id: str, project_id: str, storage_path: str):
    try:
        # 1. Update job status to processing
        supabase.table("processing_jobs").update({"status": "processing", "progress": 10}).eq("id", job_id).execute()

        # 2. Download video file locally from Supabase Storage
        bucket_name = os.getenv("STORAGE_BUCKET_NAME", "clipforge-media")
        local_video_path = f"/tmp/{job_id}.mp4"
        
        res = supabase.storage.from_(bucket_name).download(storage_path)
        with open(local_video_path, "wb") as f:
            f.write(res)

        supabase.table("processing_jobs").update({"progress": 30}).eq("id", job_id).execute()

        # 3. Retrieve or create source video record
        source_res = supabase.table("source_videos").select("id").eq("project_id", project_id).single().execute()
        source_video_id = source_res.data["id"]

        # 4. Run Whisper Transcription
        transcript_data = extract_transcript(local_video_path, source_video_id, project_id)
        supabase.table("processing_jobs").update({"progress": 60}).eq("id", job_id).execute()

        # 5. Run AI Clip Detection & Scoring
        analyze_and_extract_clips(project_id, source_video_id, local_video_path, transcript_data)
        
        # 6. Mark job complete and update project status
        supabase.table("processing_jobs").update({"status": "completed", "progress": 100}).eq("id", job_id).execute()
        supabase.table("projects").update({"status": "completed"}).eq("id", project_id).execute()

        # Cleanup local file
        if os.path.exists(local_video_path):
            os.remove(local_video_path)

    except Exception as e:
        print(f"Pipeline error: {str(e)}")
        supabase.table("processing_jobs").update({"status": "failed", "error_message": str(e)}).eq("id", job_id).execute()
        supabase.table("projects").update({"status": "failed"}).eq("id", project_id).execute()

@app.post("/api/v1/process")
async def start_processing(
    payload: ProcessRequest, 
    background_tasks: BackgroundTasks,
    auth: str = Depends(verify_secret)
):
    background_tasks.add_task(
        run_full_pipeline, 
        payload.jobId, 
        payload.projectId, 
        payload.storagePath
    )
    return {"status": "accepted", "jobId": payload.jobId}
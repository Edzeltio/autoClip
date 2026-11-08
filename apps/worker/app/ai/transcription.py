import os
import whisper
from supabase import create_client, Client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Load lightweight whisper model (e.g., 'base' or 'small')
model = whisper.load_model("base")

def extract_transcript(video_path: str, source_video_id: str, project_id: str):
    try:
        # Run Whisper transcription with word-level timestamps
        result = model.transcribe(video_path, word_timestamps=True)
        
        segments = result.get("segments", [])
        transcript_data = {
            "text": result.get("text"),
            "segments": segments,
            "language": result.get("language")
        }

        # Store transcript in Supabase
        supabase.table("transcripts").insert({
            "source_video_id": source_video_id,
            "transcript_json": transcript_data
        }).execute()

        return transcript_data
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise e
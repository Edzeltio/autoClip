import os
from scenedetect import SceneManager, open_video, ContentDetector
from openai import OpenAI
from supabase import create_client, Client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def detect_scenes(video_path: str):
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=30.0))
    scene_manager.detect_scenes(video)
    scene_list = scene_manager.get_scene_list()
    return [(scene[0].get_seconds(), scene[1].get_seconds()) for scene in scene_list]

def analyze_and_extract_clips(project_id: str, source_video_id: str, video_path: str, transcript_data: dict):
    # 1. Detect visual scene changes
    scenes = detect_scenes(video_path)
    
    # 2. Structure transcript text for LLM evaluation
    full_text = transcript_data.get("text", "")
    
    prompt = f"""
    Analyze the following video transcript and identify 3 to 5 high-impact short-form clip candidates (duration between 20 and 60 seconds).
    Evaluate for strong hooks, emotional impact, interesting statements, or self-contained valuable insights.
    
    Transcript:
    {full_text[:10000]}
    
    Return a JSON array where each object contains:
    - start_time (float in seconds)
    - end_time (float in seconds)
    - ai_score (float between 1.0 and 10.0)
    - hook_text (string)
    - suggested_title (string)
    - explanation (string)
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    import json
    content = json.loads(response.choices[0].message.content)
    candidates = content.get("clips", [])

    # 3. Save clip candidates to Supabase
    for candidate in candidates:
        supabase.table("clip_candidates").insert({
            "project_id": project_id,
            "source_video_id": source_video_id,
            "start_time": candidate["start_time"],
            "end_time": candidate["end_time"],
            "duration": candidate["end_time"] - candidate["start_time"],
            "ai_score": candidate["ai_score"],
            "hook_text": candidate["hook_text"],
            "suggested_title": candidate["suggested_title"],
            "explanation": candidate["explanation"]
        }).execute()

    return candidates
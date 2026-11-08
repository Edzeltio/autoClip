import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, storagePath, fileName, fileSize } = await request.json();

    // 1. Record source video entry
    const { data: sourceVid, error: srcError } = await supabase
      .from('source_videos')
      .insert({
        project_id: projectId,
        user_id: session.user.id,
        original_filename: fileName,
        file_size: fileSize,
        storage_path: storagePath,
        source_type: 'upload',
      })
      .select()
      .single();

    if (srcError) throw srcError;

    // 2. Queue processing job in Supabase
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        project_id: projectId,
        job_type: 'video_analysis',
        status: 'queued',
        progress: 0,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 3. Dispatch job to Python FastAPI worker asynchronously
    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:8000';
    await fetch(`${workerUrl}/api/v1/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_API_SECRET}`,
      },
      body: JSON.stringify({
        jobId: job.id,
        projectId,
        storagePath,
        userId: session.user.id,
      }),
    });

    return NextResponse.json({ success: true, jobId: job.id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
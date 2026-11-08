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

    const { videoUrl, projectId } = await request.json();

    if (!videoUrl || !projectId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Verify project ownership
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (projError || !project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // 2. Create processing job record in Supabase
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        project_id: projectId,
        job_type: 'video_import_and_analysis',
        status: 'queued',
        progress: 0,
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(jobError.message);
    }

    // 3. Dispatch to external Python FastAPI worker asynchronously
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
        videoUrl,
        userId: session.user.id,
      }),
    });

    return NextResponse.json({ success: true, jobId: job.id }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
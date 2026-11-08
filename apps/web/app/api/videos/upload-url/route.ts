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

    const { fileName, fileType, projectId } = await request.json();

    if (!fileName || !projectId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const storagePath = `${session.user.id}/${projectId}/${Date.now()}_${fileName}`;
    const bucketName = process.env.STORAGE_BUCKET_NAME || 'clipforge-media';

    // Create a signed upload URL valid for 15 minutes
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(storagePath);

    if (error) throw error;

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
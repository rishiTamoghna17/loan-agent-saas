import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyApiAccess } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const access = await verifyApiAccess(request);
    if (access.response) {
      return access.response;
    }
    const user = access.user!;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File format not supported. Please upload PDF, Word, Excel, CSV, text, or images.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const fileExt = file.name.split('.').pop();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const fileName = `${user.id}/${Date.now()}-${randomSuffix}.${fileExt}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { data, error } = await supabase.storage
      .from('campaign-attachments')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('campaign-attachments')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

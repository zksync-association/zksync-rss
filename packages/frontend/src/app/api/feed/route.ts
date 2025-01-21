import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export async function GET() {
  try {
    const storage = new Storage();
    const bucketName = 'zksync-rss';
    const fileName = 'rss/feed.xml';

    // Add debug logging
    console.log('API Route Debug: Attempting to fetch from GCS', {
      bucketName,
      fileName
    });

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('RSS feed file not found in bucket');
    }

    const [content] = await file.download();
    const data = content.toString('utf-8');
    
    // Log successful response
    console.log('GCS fetch successful, data length:', data.length);
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (err: unknown) {
    // Enhanced error logging
    const error = err as Error;
    console.error('Feed API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return NextResponse.json(
      { error: error.message || 'Failed to fetch RSS feed' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 
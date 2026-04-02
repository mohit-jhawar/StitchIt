import 'dotenv/config';
import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';
import { errorResponse, jsonResponse } from '../../lib/utils';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE    = 5 * 1024 * 1024; // 5 MB
const ALLOWED     = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  // Validate env config at request time so dev mistakes surface clearly
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY    ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error('[Upload] Missing Cloudinary environment variables');
    return errorResponse('Upload service is not configured', 503);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file)                        return errorResponse('No file provided', 400);
    if (file.size > MAX_SIZE)         return errorResponse('File too large (max 5MB)', 400);
    if (!ALLOWED.includes(file.type)) return errorResponse('Invalid file type. Only JPEG, PNG, WebP, GIF allowed', 400);

    // Convert File → base64 data URI for Cloudinary's upload API
    const buffer  = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:         'stitchshop',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    return jsonResponse({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Upload error:', err);
    return errorResponse('Upload failed', 500);
  }
};

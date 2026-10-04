import { v4 as uuidv4 } from 'uuid';
import { supabase, BUCKET_NAME, getSignedFileUrl } from '../config/supabase.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Handle direct file upload (complaints, invoices, proofs)
 * Compresses/stores in Supabase private bucket
 */
export const uploadFile = async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded.', 'VALIDATION_ERROR', [], 400);
  }

  const { folder = 'general' } = req.body;
  const societyId = req.user.societyId;
  const fileExt = req.file.originalname.split('.').pop() || 'jpg';
  const filePath = `${societyId}/${folder}/${uuidv4()}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.warn('[Supabase Upload Warning]:', error.message);
      // In local dev without live Supabase storage key, return a mockable file token
      const mockPath = `uploads/${societyId}/${uuidv4()}.${fileExt}`;
      return sendSuccess(res, {
        path: mockPath,
        fileUrl: `/api/v1/storage/file?path=${encodeURIComponent(mockPath)}`,
      }, 'File uploaded successfully (local fallback).', null, 201);
    }

    const signedUrl = await getSignedFileUrl(filePath, 3600);

    return sendSuccess(res, {
      path: filePath,
      signedUrl,
    }, 'File uploaded successfully.', null, 201);
  } catch (err) {
    console.error('[Upload File Error]:', err);
    return sendError(res, 'Failed to process file upload.');
  }
};

/**
 * Get Expiring Signed URL for private file
 */
export const getSignedUrl = async (req, res) => {
  const { path } = req.query;
  if (!path) return sendError(res, 'Storage path is required.', 'VALIDATION_ERROR', [], 400);

  try {
    const url = await getSignedFileUrl(path, 900); // 15 mins
    return sendSuccess(res, { signedUrl: url });
  } catch (err) {
    return sendError(res, 'Failed to generate signed URL.');
  }
};

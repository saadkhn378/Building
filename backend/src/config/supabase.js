import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-key';
export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'society-private-vault';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generates an expiring signed URL for private bucket asset
 * @param {string} path - Storage path
 * @param {number} expiresInSeconds - Expiration time (default 15 minutes = 900s)
 * @returns {Promise<string>} Signed URL
 */
export const getSignedFileUrl = async (path, expiresInSeconds = 900) => {
  if (!path) return null;
  // If path is already a full http URL (e.g. placeholder or external), return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      console.warn('[Storage Warning] Error creating signed URL:', error.message);
      // Fallback relative or dummy URL for local testing
      return `/api/v1/storage/file?path=${encodeURIComponent(path)}`;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('[Storage Error]:', err.message);
    return `/api/v1/storage/file?path=${encodeURIComponent(path)}`;
  }
};

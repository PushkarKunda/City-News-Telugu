import Constants from 'expo-constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';

// ─── Config ──────────────────────────────────────────────────────────────────

const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? (extra as any).supabaseUrl;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (extra as any).supabaseAnonKey;

// FIXED: Must have EXPO_PUBLIC_ prefix to work in Expo
const supabaseBucket =
  process.env.EXPO_PUBLIC_SUPABASE_BUCKET ?? 'new-images';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

// ─── Client ───────────────────────────────────────────────────────────────────

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadImageResult {
  publicUrl: string;
  filePath: string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads a compressed local URI to Supabase Storage
 * Returns the public URL to send to backend
 *
 * Flow:
 * compressImage(uri) → uploadImageToSupabase(compressed.uri) → publicUrl
 * → PATCH /user/users/me { profile_picture: publicUrl }
 */
function decodeBase64(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const base64_0 = lookup[base64.charCodeAt(i)];
    const base64_1 = lookup[base64.charCodeAt(i + 1)];
    const base64_2 = lookup[base64.charCodeAt(i + 2)];
    const base64_3 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (base64_0 << 2) | (base64_1 >> 4);
    if (base64_2 !== 64 && p < bufferLength) {
      bytes[p++] = ((base64_1 & 15) << 4) | (base64_2 >> 2);
    }
    if (base64_3 !== 64 && p < bufferLength) {
      bytes[p++] = ((base64_2 & 3) << 6) | base64_3;
    }
  }

  return arrayBuffer;
}

export const uploadImageToSupabaseProfile = async (
  localUri: string,
  folder = 'profile',
  bucket = supabaseBucket
): Promise<string> => {
  if (!isSupabaseConfigured) {
    throw new Error('[Supabase] Not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  try {
    // 1. Read file as base64
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [],
      { base64: true }
    );

    if (!result.base64) {
      throw new Error(`Failed to read base64 from: ${localUri}`);
    }

    const arrayBuffer = decodeBase64(result.base64);

    // 2. Generate unique file path
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const filePath = `${folder}/${uniqueId}.${ext}`;

    console.log(`📤 Uploading to: ${bucket}/${filePath}`);

    // 3. Upload
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no path returned');
    }

    // 4. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('✅ Upload successful:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (error: any) {
    console.error('[Supabase] Upload failed:', error);

    // More specific error messages
    if (error.message?.includes('Bucket not found')) {
      throw new Error(`Bucket "${bucket}" not found. Check your Supabase dashboard.`);
    }
    if (error.message?.includes('permission')) {
      throw new Error('Upload permission denied. Check your RLS policies.');
    }

    throw error;
  }
};

export const uploadImageToSupabaseNews = async (
  localUri: string,
  folder = 'news',
  bucket = supabaseBucket
): Promise<string> => {
  if (!isSupabaseConfigured) {
    throw new Error('[Supabase] Not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  try {
    // 1. Read file as base64
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [],
      { base64: true }
    );

    if (!result.base64) {
      throw new Error(`Failed to read base64 from: ${localUri}`);
    }

    const arrayBuffer = decodeBase64(result.base64);

    // 2. Generate unique file path
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const filePath = `${folder}/${uniqueId}.${ext}`;

    console.log(`📤 Uploading to: ${bucket}/${filePath}`);

    // 3. Upload
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no path returned');
    }

    // 4. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('✅ Upload successful:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (error: any) {
    console.error('[Supabase] Upload failed:', error);

    // More specific error messages
    if (error.message?.includes('Bucket not found')) {
      throw new Error(`Bucket "${bucket}" not found. Check your Supabase dashboard.`);
    }
    if (error.message?.includes('permission')) {
      throw new Error('Upload permission denied. Check your RLS policies.');
    }

    throw error;
  }
};

export const getSupabaseConfigStatus = () => ({
  isConfigured: isSupabaseConfigured,
  hasUrl: Boolean(supabaseUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
  bucket: supabaseBucket,
});

//Just for testing
console.log(getSupabaseConfigStatus());
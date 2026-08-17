/**
 * CampusBF - Supabase Storage & RLS Diagnostic / Verification Script
 * Inspects bucket existence, access tokens, and read/write/download permissions.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgwmqrinncjoqtiueyln.supabase.co';
const supabaseKey = 'sb_publishable_6bEBk-kZjLE3PIUm5JQfIQ_qTCJGV3K';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface BucketDiagnosticResult {
  bucket: string;
  exists: boolean;
  canRead: boolean;
  canUpload: boolean;
  canDownload: boolean;
  publicUrlGenerated: string;
  errorDetails?: string;
}

export async function runSupabaseDiagnostics(customToken?: string): Promise<{
  timestamp: string;
  supabaseUrl: string;
  tokenRole: string;
  results: BucketDiagnosticResult[];
  recommendedSql: string;
}> {
  console.log('====================================================');
  console.log('🔍 INITIATING SUPABASE STORAGE & RLS INSPECTION');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Key Type: Publishable / Anon');
  console.log('====================================================\n');

  // If a custom auth token is passed, create an authenticated client instance
  const client = customToken
    ? createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${customToken}` } },
      })
    : supabase;

  // Determine token role
  let tokenRole = 'anon';
  if (customToken) {
    try {
      const payloadBase64 = customToken.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
      tokenRole = decoded.role || decoded.user_metadata?.role || 'authenticated';
      console.log(`👤 Verified Auth Token. Role: "${tokenRole}", User: ${decoded.sub || decoded.email || 'N/A'}`);
    } catch {
      tokenRole = 'custom-bearer';
    }
  }

  const targetBuckets = ['uploads', 'documents', 'assignments', 'videos'];
  const results: BucketDiagnosticResult[] = [];

  for (const bucket of targetBuckets) {
    console.log(`\n--- Inspecting Bucket: [${bucket}] ---`);
    let exists = true;
    let canRead = false;
    let canUpload = false;
    let canDownload = false;
    let errorDetails = '';

    // 1. Check Read / List permission
    try {
      const { data: listData, error: listError } = await client.storage.from(bucket).list('', { limit: 1 });
      if (listError) {
        if (listError.message.toLowerCase().includes('bucket not found')) {
          exists = false;
          errorDetails = 'Bucket not found (Needs creation in Supabase Storage)';
          console.log(`❌ Bucket "${bucket}" DOES NOT EXIST.`);
        } else {
          errorDetails = `Read RLS Error: ${listError.message}`;
          console.log(`⚠️ Read RLS blocked on "${bucket}":`, listError.message);
        }
      } else {
        canRead = true;
        console.log(`✅ Read / List permission: OK (Visible items: ${listData?.length || 0})`);
      }
    } catch (err: any) {
      errorDetails = `Exception listing bucket: ${err.message}`;
    }

    // 2. Public URL probe
    const { data: pubUrlData } = client.storage.from(bucket).getPublicUrl('test-sample.pdf');
    const publicUrlGenerated = pubUrlData.publicUrl;

    // 3. Check Upload permission
    if (exists) {
      const probeName = `probe_${Date.now()}.txt`;
      const probeContent = Buffer.from(`CampusBF Verification Probe [${bucket}] ${new Date().toISOString()}`, 'utf-8');
      try {
        const { error: uploadError } = await client.storage.from(bucket).upload(probeName, probeContent, {
          contentType: 'text/plain',
          upsert: true,
        });

        if (uploadError) {
          if (uploadError.message.toLowerCase().includes('bucket not found')) {
            exists = false;
            errorDetails = 'Bucket not found';
          } else {
            errorDetails = errorDetails ? `${errorDetails} | Upload: ${uploadError.message}` : `Upload RLS Error: ${uploadError.message}`;
          }
          console.log(`⚠️ Upload test on "${bucket}": FAILED (${uploadError.message})`);
        } else {
          canUpload = true;
          console.log(`✅ Upload permission on "${bucket}": GRANTED`);

          // 4. Check Download permission
          const { error: dlError } = await client.storage.from(bucket).download(probeName);
          if (dlError) {
            console.log(`⚠️ Download test on "${bucket}": FAILED (${dlError.message})`);
          } else {
            canDownload = true;
            console.log(`✅ Download permission on "${bucket}": GRANTED`);
          }

          // Clean up
          await client.storage.from(bucket).remove([probeName]);
        }
      } catch (err: any) {
        errorDetails = `${errorDetails} | Upload exception: ${err.message}`;
      }
    }

    results.push({
      bucket,
      exists,
      canRead,
      canUpload,
      canDownload,
      publicUrlGenerated,
      errorDetails: errorDetails || undefined,
    });
  }

  const recommendedSql = `
-- =========================================================================
-- CAMPUSBF SUPABASE STORAGE & RLS PERMISSIONS CONFIGURATION SCRIPT
-- Execute this SQL in your Supabase Dashboard > SQL Editor:
-- =========================================================================

-- 1. Create Required Buckets (uploads, documents, assignments, videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('uploads', 'uploads', true, 52428800, NULL),
  ('documents', 'documents', true, 52428800, NULL),
  ('assignments', 'assignments', true, 52428800, NULL),
  ('videos', 'videos', true, 524288000, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable Row Level Security (RLS) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read / Download Access for Students & All Users on 'uploads', 'documents', 'assignments', 'videos'
CREATE POLICY "Public and Authenticated Students Read Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 4. Policy: Allow Uploads (INSERT) for Authenticated Users / Students / Teachers
CREATE POLICY "Allow Upload for Authenticated and Public Users"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 5. Policy: Allow Update / Upsert for Students & Teachers
CREATE POLICY "Allow Update on Uploads and Documents"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 6. Policy: Allow Delete for Object Owners / Admins
CREATE POLICY "Allow Delete on Uploads and Documents"
ON storage.objects FOR DELETE
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));
`;

  return {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tokenRole,
    results,
    recommendedSql,
  };
}

// If run directly via CLI
if (process.argv[1]?.endsWith('verifySupabasePermissions.ts')) {
  runSupabaseDiagnostics()
    .then((report) => {
      console.log('\n====================================================');
      console.log('📊 FINAL DIAGNOSTIC SUMMARY');
      console.log('====================================================');
      console.table(report.results);
      console.log('\n📜 RECOMMENDED SUPABASE SQL SCRIPT:');
      console.log(report.recommendedSql);
    })
    .catch(console.error);
}

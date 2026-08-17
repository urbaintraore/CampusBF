import { supabase } from '@/lib/supabase';

export interface StorageDiagnosticResult {
  bucket: string;
  exists: boolean;
  canRead: boolean;
  canUpload: boolean;
  canDownload: boolean;
  publicUrlGenerated: string;
  errorDetails?: string;
}

export interface SupabaseDiagnosticReport {
  timestamp: string;
  supabaseUrl: string;
  tokenRole: string;
  results: StorageDiagnosticResult[];
  recommendedSql: string;
}

/**
 * Diagnostic runner for Supabase Storage buckets & RLS policies
 */
export async function runSupabaseDiagnostics(customToken?: string): Promise<SupabaseDiagnosticReport> {
  const supabaseUrl = 'https://xgwmqrinncjoqtiueyln.supabase.co';
  
  let tokenRole = 'anon';
  if (customToken) {
    try {
      const payloadBase64 = customToken.split('.')[1];
      const decoded = JSON.parse(atob(payloadBase64));
      tokenRole = decoded.role || decoded.user_metadata?.role || 'authenticated';
    } catch {
      tokenRole = 'authenticated';
    }
  }

  const targetBuckets = ['uploads', 'documents', 'assignments', 'videos'];
  const results: StorageDiagnosticResult[] = [];

  for (const bucket of targetBuckets) {
    let exists = true;
    let canRead = false;
    let canUpload = false;
    let canDownload = false;
    let errorDetails = '';

    // 1. Check Read
    try {
      const { data: listData, error: listError } = await supabase.storage.from(bucket).list('', { limit: 1 });
      if (listError) {
        if (listError.message.toLowerCase().includes('bucket not found')) {
          exists = false;
          errorDetails = 'Bucket not found';
        } else {
          errorDetails = `Read RLS: ${listError.message}`;
        }
      } else {
        canRead = true;
      }
    } catch (err: any) {
      errorDetails = err.message;
    }

    // 2. Public URL probe
    const { data: pubUrlData } = supabase.storage.from(bucket).getPublicUrl('probe.pdf');
    const publicUrlGenerated = pubUrlData.publicUrl;

    // 3. Upload probe
    if (exists) {
      const probeName = `probe_${Date.now()}.txt`;
      const probeBlob = new Blob([`Probe test for ${bucket} at ${new Date().toISOString()}`], { type: 'text/plain' });

      try {
        const { error: uploadError } = await supabase.storage.from(bucket).upload(probeName, probeBlob, {
          upsert: true
        });

        if (uploadError) {
          if (uploadError.message.toLowerCase().includes('bucket not found')) {
            exists = false;
            errorDetails = 'Bucket not found';
          } else {
            errorDetails = `Upload RLS: ${uploadError.message}`;
          }
        } else {
          canUpload = true;

          // 4. Download probe
          const { error: dlError } = await supabase.storage.from(bucket).download(probeName);
          if (!dlError) {
            canDownload = true;
          }

          // Cleanup
          await supabase.storage.from(bucket).remove([probeName]);
        }
      } catch (err: any) {
        errorDetails = err.message;
      }
    }

    results.push({
      bucket,
      exists,
      canRead,
      canUpload,
      canDownload,
      publicUrlGenerated,
      errorDetails: errorDetails || undefined
    });
  }

  const recommendedSql = `-- =========================================================================
-- CAMPUSBF - CONFIGURATION SUPABASE STORAGE & RÈGLES RLS
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- =========================================================================

-- 1. Création des buckets de stockage (uploads, documents, assignments, videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('uploads', 'uploads', true, 52428800, NULL),
  ('documents', 'documents', true, 52428800, NULL),
  ('assignments', 'assignments', true, 52428800, NULL),
  ('videos', 'videos', true, 524288000, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Activation de la sécurité RLS sur la table storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Règle : Droit de lecture/téléchargement pour tous (étudiants & public)
CREATE POLICY "Public Read Access for Students"
ON storage.objects FOR SELECT
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 4. Règle : Droit d'upload pour les utilisateurs authentifiés & étudiants
CREATE POLICY "Allow Upload for Students and Teachers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 5. Règle : Droit de mise à jour pour les fichiers déposés
CREATE POLICY "Allow Update on Storage Objects"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 6. Règle : Droit de suppression
CREATE POLICY "Allow Delete on Storage Objects"
ON storage.objects FOR DELETE
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));
`;

  return {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tokenRole,
    results,
    recommendedSql
  };
}

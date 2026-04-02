import { supabase } from "@/integrations/supabase/client";
import { logUploadError } from "@/lib/error-logger";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

export function validateFile(
  file: File,
  acceptedTypes = ACCEPTED_TYPES,
  maxSize = MAX_SIZE
): { valid: boolean; error?: string } {
  if (!acceptedTypes.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Please upload PDF, DOC, or DOCX." };
  }
  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
    return { valid: false, error: `File too large. Maximum size is ${sizeMB}MB.` };
  }
  return { valid: true };
}

export async function uploadFileWithRetry(
  bucket: string,
  path: string,
  file: File,
  maxRetries = 2
): Promise<UploadResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      return { success: true, path };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  logUploadError(lastError, file.name);
  const message =
    lastError instanceof Error ? lastError.message : "Upload failed. Please try again.";
  return { success: false, error: message };
}

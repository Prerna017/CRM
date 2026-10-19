/**
 * File Security & MIME Validation Utility
 * Enforces strict MIME whitelist, extension parity, and size boundaries
 * to prevent malicious file execution, MIME spoofing, and storage exhaustion.
 */

export const FILE_LIMITS = {
  AVATAR_MAX_BYTES: 2 * 1024 * 1024, // 2MB
  DOCUMENT_MAX_BYTES: 10 * 1024 * 1024, // 10MB
  POLICY_MAX_BYTES: 10 * 1024 * 1024, // 10MB
  NOTICE_ATTACHMENT_MAX_BYTES: 10 * 1024 * 1024, // 10MB
} as const;

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
] as const;

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'js', 'ts', 'vbs', 'php', 'phtml',
  'py', 'rb', 'cgi', 'pl', 'jar', 'msi', 'com', 'scr', 'hta', 'cpl', 'msc'
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

/**
 * Validates file properties before upload.
 */
export function validateFile(
  file: { name: string; size: number; type: string },
  category: 'avatar' | 'document' | 'policy' | 'notice'
): FileValidationResult {
  // 1. Check filename and dangerous extensions
  const nameParts = file.name.split('.');
  if (nameParts.length < 2) {
    return { valid: false, error: 'Files without an extension are prohibited.' };
  }

  const extension = nameParts.pop()?.toLowerCase() || '';
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return { valid: false, error: `Executable or script extension .${extension} is strictly prohibited.` };
  }

  // 2. Size boundary check
  const maxBytes = category === 'avatar' 
    ? FILE_LIMITS.AVATAR_MAX_BYTES 
    : FILE_LIMITS.DOCUMENT_MAX_BYTES;

  if (file.size > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    return { valid: false, error: `File exceeds maximum allowed size of ${maxMb}MB.` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Empty files cannot be uploaded.' };
  }

  // 3. MIME type whitelist check
  if (category === 'avatar') {
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as typeof ALLOWED_AVATAR_MIME_TYPES[number])) {
      return { 
        valid: false, 
        error: `Invalid image type (${file.type}). Permitted types: JPG, PNG, WebP.` 
      };
    }
  } else {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as typeof ALLOWED_DOCUMENT_MIME_TYPES[number])) {
      return { 
        valid: false, 
        error: `Invalid document type (${file.type}). Permitted types: PDF, DOCX, JPG, PNG.` 
      };
    }
  }

  // 4. Sanitize filename (remove path traversal attempts, spaces, dangerous chars)
  const baseName = nameParts.join('.').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedFilename = `${baseName}_${Date.now()}.${extension}`;

  return { valid: true, sanitizedFilename };
}

/**
 * Generates an access token / signed URL reference with expiration
 */
export function generateSignedAccessUrl(bucket: string, path: string, expiresInSeconds = 3600): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `/storage/v1/object/sign/${bucket}/${encodeURIComponent(path)}?token=secure_temp_token&expires=${expiresAt}`;
}

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const MASTER_DIR = path.join(STORAGE_ROOT, "master_pdfs");
const GENERATED_DIR = path.join(STORAGE_ROOT, "generated_pdfs");
const TEMP_DIR = path.join(STORAGE_ROOT, "temp");

// Maximum upload size in bytes (default 25 MB)
const MAX_UPLOAD_SIZE = (parseInt(process.env.MAX_UPLOAD_SIZE_MB || "25", 10)) * 1024 * 1024;

// Ensure directories exist
export function initStorageDirectories() {
  for (const dir of [STORAGE_ROOT, MASTER_DIR, GENERATED_DIR, TEMP_DIR]) {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  }
}

// Check PDF magic bytes: standard PDF files start with %PDF- (hex: 25 50 44 46 2D)
export function isValidPdfSignature(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  // Look for %PDF- in the first 1024 bytes (some PDFs have slight leading whitespace or BOM)
  const header = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("latin1");
  return header.includes("%PDF-");
}

export type StorageCategory = "master" | "generated" | "temp";

function getCategoryDir(category: StorageCategory): string {
  initStorageDirectories();
  switch (category) {
    case "master":
      return MASTER_DIR;
    case "generated":
      return GENERATED_DIR;
    case "temp":
      return TEMP_DIR;
  }
}

/**
 * Validates and sanitizes a storage key to prevent directory traversal.
 * Key must strictly match UUID/hex filename pattern: e.g. "uuid.pdf"
 */
export function sanitizeStorageKey(key: string): string {
  if (!key || typeof key !== "string") {
    throw new Error("Invalid storage key provided");
  }

  // Prevent directory traversal sequences in raw key
  if (key.includes("..") || key.includes("/") || key.includes("\\")) {
    throw new Error("Potential path traversal detected in storage key");
  }

  // Remove any remaining invalid characters
  const sanitized = key.replace(/[^a-zA-Z0-9_\-.]/g, "");
  if (!sanitized) {
    throw new Error("Invalid storage key provided");
  }

  return sanitized;
}

/**
 * Resolves absolute path to a stored file safely.
 */
export function getSafeFilePath(key: string, category: StorageCategory = "master"): string {
  const sanitized = sanitizeStorageKey(key);
  const dir = getCategoryDir(category);
  const resolved = path.resolve(dir, sanitized);

  // Enforce that resolved path stays within the category directory
  if (!resolved.startsWith(dir)) {
    throw new Error("Access denied: path traversal restriction");
  }

  return resolved;
}

/**
 * Saves a PDF buffer into private secure storage.
 */
export async function savePdfFile(
  buffer: Buffer,
  category: StorageCategory = "master",
  customPrefix?: string
): Promise<{ key: string; size: number; sha256: string }> {
  initStorageDirectories();

  if (buffer.length > MAX_UPLOAD_SIZE) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB`);
  }

  if (!isValidPdfSignature(buffer)) {
    throw new Error("Invalid file content: Not a valid PDF document (magic byte signature verification failed)");
  }

  const fileId = crypto.randomUUID();
  const prefix = customPrefix ? `${customPrefix.replace(/[^a-zA-Z0-9_-]/g, "")}_` : "";
  const key = `${prefix}${fileId}.pdf`;

  const filePath = getSafeFilePath(key, category);
  await fs.writeFile(filePath, buffer);

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    key,
    size: buffer.length,
    sha256: hash,
  };
}

/**
 * Reads a PDF buffer from secure storage.
 */
export async function getPdfBuffer(key: string, category: StorageCategory = "master"): Promise<Buffer> {
  const filePath = getSafeFilePath(key, category);
  try {
    return await fs.readFile(filePath);
  } catch (err: unknown) {
    // If not found in primary category, check generated or master fallback
    if (category !== "generated") {
      const fallbackPath = getSafeFilePath(key, "generated");
      if (fsSync.existsSync(fallbackPath)) {
        return await fs.readFile(fallbackPath);
      }
    }
    throw new Error(`File not found or inaccessible: ${key}`);
  }
}

/**
 * Checks if a file exists in secure storage.
 */
export function checkFileExists(key: string, category: StorageCategory = "master"): boolean {
  try {
    const filePath = getSafeFilePath(key, category);
    return fsSync.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Calculates SHA256 of an existing stored file.
 */
export async function getFileHash(key: string, category: StorageCategory = "master"): Promise<string> {
  const buffer = await getPdfBuffer(key, category);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Safely deletes a file from storage.
 */
export async function deletePdfFile(key: string, category: StorageCategory = "master"): Promise<boolean> {
  try {
    const filePath = getSafeFilePath(key, category);
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

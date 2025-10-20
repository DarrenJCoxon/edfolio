/**
 * Name Validation Utilities
 * Provides validation for file and folder names
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_NAME_LENGTH = 255;

/**
 * Validate a file name
 * @param name - The file name to validate
 * @param existingNames - Array of existing sibling file names to check for duplicates
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateFileName(
  name: string,
  existingNames: string[]
): ValidationResult {
  // Trim whitespace
  const trimmedName = name.trim();

  // Check if empty
  if (trimmedName.length === 0) {
    return {
      valid: false,
      error: 'File name cannot be empty',
    };
  }

  // Check length
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `File name cannot exceed ${MAX_NAME_LENGTH} characters`,
    };
  }

  // Check for duplicates (case-insensitive)
  const isDuplicate = existingNames.some(
    (existingName) => existingName.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: 'A file with this name already exists',
    };
  }

  return { valid: true };
}

/**
 * Validate a folder name
 * @param name - The folder name to validate
 * @param existingNames - Array of existing sibling folder names to check for duplicates
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateFolderName(
  name: string,
  existingNames: string[]
): ValidationResult {
  // Trim whitespace
  const trimmedName = name.trim();

  // Check if empty
  if (trimmedName.length === 0) {
    return {
      valid: false,
      error: 'Folder name cannot be empty',
    };
  }

  // Check length
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Folder name cannot exceed ${MAX_NAME_LENGTH} characters`,
    };
  }

  // Check for duplicates (case-insensitive)
  const isDuplicate = existingNames.some(
    (existingName) => existingName.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: 'A folder with this name already exists',
    };
  }

  return { valid: true };
}

/**
 * Sanitize a file/folder name by trimming whitespace
 * @param name - The name to sanitize
 * @returns Sanitized name
 */
export function sanitizeFileName(name: string): string {
  return name.trim();
}

/** Max attachment size for board file uploads (bytes). */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

export function fileTooLargeMessage(filename?: string): string {
  const name = filename?.trim() ? `"${filename.trim()}" ` : "";
  return `${name}exceeds the ${MAX_FILE_SIZE_MB} MB upload limit.`.trim();
}

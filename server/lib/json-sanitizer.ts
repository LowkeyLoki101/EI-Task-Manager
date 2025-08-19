/**
 * JSON Sanitization Utilities
 * Handles AI responses that come wrapped in markdown code blocks
 */

export function sanitizeJsonResponse(content: string): string {
  // Remove markdown code blocks
  const cleanContent = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .replace(/^```\s*/gi, '')
    .trim();
  
  return cleanContent;
}

export function safeJsonParse<T>(content: string, fallback: T): T {
  try {
    const sanitized = sanitizeJsonResponse(content);
    return JSON.parse(sanitized) as T;
  } catch (error) {
    console.error('[JsonSanitizer] Parse failed, using fallback:', error);
    console.error('[JsonSanitizer] Original content:', content);
    return fallback;
  }
}

export function validateAndParseJson<T>(
  content: string, 
  validator: (obj: any) => obj is T,
  fallback: T
): T {
  try {
    const sanitized = sanitizeJsonResponse(content);
    const parsed = JSON.parse(sanitized);
    
    if (validator(parsed)) {
      return parsed;
    } else {
      console.error('[JsonSanitizer] Validation failed, using fallback');
      return fallback;
    }
  } catch (error) {
    console.error('[JsonSanitizer] Parse/validation failed, using fallback:', error);
    return fallback;
  }
}

export function isValidJson(content: string): boolean {
  try {
    const sanitized = sanitizeJsonResponse(content);
    JSON.parse(sanitized);
    return true;
  } catch {
    return false;
  }
}
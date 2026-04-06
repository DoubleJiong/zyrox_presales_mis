import DOMPurify from 'isomorphic-dompurify';

const MAX_SEARCH_LENGTH = 200;
const UNSAFE_HTML_PATTERN = /<[^>]+>|<script|<\/script|javascript:|on\w+=/i;

export function sanitizePlainText(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function sanitizeSearchText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const sanitized = sanitizePlainText(input.slice(0, MAX_SEARCH_LENGTH));
  return sanitized.replace(/['";\\]/g, '').trim();
}

export function containsUnsafeHtml(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return UNSAFE_HTML_PATTERN.test(input);
}

export function sanitizeUnknownValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizePlainText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknownValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [sanitizePlainText(key), sanitizeUnknownValue(entryValue)])
    );
  }

  return value;
}
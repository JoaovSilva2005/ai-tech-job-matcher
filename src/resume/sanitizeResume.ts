/**
 * Privacy layer: resumes contain personal data (PII), so before the text is
 * sent to any AI provider or persisted in intermediate JSON files we mask
 * emails, phone numbers and URLs that could identify the candidate.
 *
 * The original resume file is never copied into the output folder and the
 * full resume text is never written to logs.
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Matches international and Brazilian phone formats:
// +55 11 91234-5678, (11) 91234-5678, 11912345678, +1 555-123-4567 ...
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}(?!\d)/g;

// Personal document numbers (e.g. Brazilian CPF: 123.456.789-00)
const CPF_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;

const LINKEDIN_PATTERN = /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/gi;

export function sanitizeResumeText(text: string): string {
  return text
    .replace(EMAIL_PATTERN, '[email-redacted]')
    .replace(CPF_PATTERN, '[document-redacted]')
    .replace(LINKEDIN_PATTERN, '[linkedin-redacted]')
    .replace(PHONE_PATTERN, (match) => {
      // avoid masking years/dates such as "2023 2024" or plain numbers in text
      const digits = match.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 14) return match;
      return '[phone-redacted]';
    });
}

/** Short, safe preview used only in debug logs (never the whole resume). */
export function safeResumePreview(text: string, maxLength = 80): string {
  const sanitized = sanitizeResumeText(text).replace(/\s+/g, ' ');
  return sanitized.slice(0, maxLength) + (sanitized.length > maxLength ? '…' : '');
}

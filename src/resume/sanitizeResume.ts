/**
 * Privacy layer: resumes contain personal data (PII), so before the text is
 * sent to any AI provider or persisted in intermediate JSON files we mask
 * direct identifiers and remove a likely name header.
 *
 * The original resume file is never copied into the output folder and the
 * full resume text is never written to logs.
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Matches international and Brazilian phone formats:
// +55 11 91234-5678, (11) 91234-5678, 11912345678, +1 555-123-4567 ...
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}(?!\d)/g;

// Personal document numbers (e.g. Brazilian CPF: 123.456.789-00)
const CPF_PATTERN = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g;

const LINKEDIN_PATTERN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/gi;
const GITHUB_PATTERN = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s)]+/gi;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const LABELED_ADDRESS_LINE =
  /^(?:address|endere[cç]o|location|localiza[cç][aã]o|cidade|city)\s*:\s*.+$/gim;
const STREET_ADDRESS_LINE =
  /^(?:rua|r\.|avenida|av\.|alameda|travessa|street|st\.|avenue|road)\s+.+$/gim;
const NAME_PATTERN = /^[\p{L}'-]+(?:\s+[\p{L}'-]+){1,5}$/u;
const ROLE_TERMS =
  /\b(?:qa|quality|analyst|analista|developer|desenvolvedor|engineer|engenheiro|tester|estudante|student|curriculum|curr[ií]culo|resume)\b/i;

export function sanitizeResumeText(text: string): string {
  return redactLikelyNameHeader(text)
    .replace(EMAIL_PATTERN, '[email-redacted]')
    .replace(CPF_PATTERN, '[document-redacted]')
    .replace(LINKEDIN_PATTERN, '[linkedin-redacted]')
    .replace(GITHUB_PATTERN, '[github-redacted]')
    .replace(URL_PATTERN, '[url-redacted]')
    .replace(LABELED_ADDRESS_LINE, '[address-redacted]')
    .replace(STREET_ADDRESS_LINE, '[address-redacted]')
    .replace(PHONE_PATTERN, (match) => {
      // avoid masking years/dates such as "2023 2024" or plain numbers in text
      const digits = match.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 14) return match;
      return '[phone-redacted]';
    });
}

function redactLikelyNameHeader(text: string): string {
  const lines = text.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex < 0) return text;

  const firstLine = lines[firstContentIndex].trim();
  if (firstLine.length <= 80 && NAME_PATTERN.test(firstLine) && !ROLE_TERMS.test(firstLine)) {
    lines[firstContentIndex] = '[name-redacted]';
  }
  return lines.join('\n');
}

/** Short, safe preview used only in debug logs (never the whole resume). */
export function safeResumePreview(text: string, maxLength = 80): string {
  const sanitized = sanitizeResumeText(text).replace(/\s+/g, ' ');
  return sanitized.slice(0, maxLength) + (sanitized.length > maxLength ? '…' : '');
}

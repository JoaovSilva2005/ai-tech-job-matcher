import fs from 'fs';
import os from 'os';
import path from 'path';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';
import { MAX_RESUME_CHARACTERS, parseResume, ResumeParseError } from '../../src/resume/parseResume';

test.describe('parseResume input limits', () => {
  test('distinguishes Markdown from plain text', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-format-'));
    const markdownPath = path.join(root, 'resume.md');
    fs.writeFileSync(markdownPath, '# QA Analyst\n\nPlaywright, TypeScript, Git and API Testing.');

    try {
      const parsed = await parseResume(markdownPath);
      expect(parsed.format).toBe('md');
      expect(parsed.text).toContain('Playwright');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects extracted resume text above the safety limit', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-limit-'));
    const resumePath = path.join(root, 'resume.txt');
    fs.writeFileSync(resumePath, 'a'.repeat(MAX_RESUME_CHARACTERS + 1));

    try {
      await expect(parseResume(resumePath)).rejects.toThrow(ResumeParseError);
      await expect(parseResume(resumePath)).rejects.toThrow('too large to analyze');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('extracts text from a real PDF resume', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-pdf-'));
    const resumePath = path.join(root, 'resume.pdf');
    fs.writeFileSync(
      resumePath,
      await buildPdf('Junior QA Analyst with Playwright TypeScript Git and API Testing experience')
    );

    try {
      const parsed = await parseResume(resumePath);
      expect(parsed.format).toBe('pdf');
      expect(parsed.text).toContain('Playwright');
      expect(parsed.characterCount).toBeGreaterThan(30);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('extracts text from a real DOCX resume', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-docx-'));
    const resumePath = path.join(root, 'resume.docx');
    fs.writeFileSync(
      resumePath,
      await buildMinimalDocx(
        'Junior QA Analyst with Playwright TypeScript Git and API Testing experience'
      )
    );

    try {
      const parsed = await parseResume(resumePath);
      expect(parsed.format).toBe('docx');
      expect(parsed.text).toContain('Playwright');
      expect(parsed.characterCount).toBeGreaterThan(30);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

function buildPdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ compress: false });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.fontSize(12).text(text);
    document.end();
  });
}

async function buildMinimalDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>'
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body><w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:body>` +
      '</w:document>'
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

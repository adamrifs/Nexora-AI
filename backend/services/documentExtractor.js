/**
 * documentExtractor.js
 * Pure text-extraction service for each supported file type.
 * All functions receive a Buffer and return { text, pages? }.
 */

const pdfParse  = require('pdf-parse');
const mammoth   = require('mammoth');
const XLSX      = require('xlsx');
const AdmZip    = require('adm-zip');

// ─── PDF ─────────────────────────────────────────────────────────────────────
const extractPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return { text: data.text, pages: data.numpages };
  } catch (e) {
    throw new Error(`PDF extraction failed: ${e.message}`);
  }
};

// ─── DOCX ────────────────────────────────────────────────────────────────────
const extractDocx = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  } catch (e) {
    throw new Error(`DOCX extraction failed: ${e.message}`);
  }
};

// ─── PPTX ────────────────────────────────────────────────────────────────────
// PPTX is a ZIP archive containing slide XML files.
// We unzip with adm-zip and extract text from <a:t> tags.
const extractPptx = async (buffer) => {
  try {
    const zip    = new AdmZip(buffer);
    const entries = zip.getEntries();
    let slideTexts = [];

    entries.forEach(entry => {
      if (/ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName)) {
        const xml = entry.getData().toString('utf8');
        // Collect all <a:t>…</a:t> text nodes
        const matches = [...xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)];
        const slideText = matches.map(m => m[1]).join(' ');
        if (slideText.trim()) slideTexts.push(slideText.trim());
      }
    });

    if (slideTexts.length === 0) {
      throw new Error('No readable text found in PPTX slides.');
    }

    return { text: slideTexts.join('\n\n'), pages: slideTexts.length };
  } catch (e) {
    throw new Error(`PPTX extraction failed: ${e.message}`);
  }
};

// ─── XLSX ────────────────────────────────────────────────────────────────────
const extractXlsx = async (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let sections = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv   = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        sections.push(`=== Sheet: ${sheetName} ===\n${csv}`);
      }
    });

    return { text: sections.join('\n\n') };
  } catch (e) {
    throw new Error(`XLSX extraction failed: ${e.message}`);
  }
};

// ─── CSV ─────────────────────────────────────────────────────────────────────
const extractCsv = async (buffer) => {
  try {
    const text = buffer.toString('utf8');
    return { text };
  } catch (e) {
    throw new Error(`CSV extraction failed: ${e.message}`);
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────
/**
 * Dispatch text extraction by file extension.
 * @param {Buffer} buffer       - Raw file bytes
 * @param {string} originalName - Original filename (used to detect extension)
 * @returns {{ text: string, pages?: number }}
 */
const extractText = async (buffer, originalName) => {
  const ext = originalName.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf':  return extractPdf(buffer);
    case 'docx':
    case 'doc':  return extractDocx(buffer);
    case 'pptx':
    case 'ppt':  return extractPptx(buffer);
    case 'xlsx':
    case 'xls':  return extractXlsx(buffer);
    case 'csv':  return extractCsv(buffer);
    default:
      throw new Error(`Unsupported file type: .${ext}. Supported: PDF, DOCX, PPTX, XLSX, CSV`);
  }
};

module.exports = { extractText };

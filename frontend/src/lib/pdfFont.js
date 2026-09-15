import fontUrl from '../assets/fonts/NotoSansDevanagari-Regular.ttf';

let cached;
const hasUnicode = text => Array.from(text).some(character => character.codePointAt(0) > 127);
export async function registerPDFFont(doc, text) {
  if (!hasUnicode(text)) return false;
  if (Array.from(text).some(character => character.codePointAt(0) > 127 && !/[\u0080-\u024f\u0900-\u097f\u1cd0-\u1cff\u2000-\u206f\u20a0-\u20cf\ua8e0-\ua8ff]/.test(character))) {
    throw new Error('This PDF font supports Latin and Devanagari text. Use CSV for other scripts until a matching licensed PDF font is configured.');
  }
  if (!cached) {
    cached = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(fontUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('The PDF font could not be loaded. Retry the export.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
        return btoa(binary);
      } finally { clearTimeout(timeout); }
    })().catch(error => { cached = null; throw error; });
  }
  doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', await cached);
  doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoDevanagari', 'normal');
  const originalText = doc.text.bind(doc);
  doc.text = (value, ...args) => {
    const unicode = hasUnicode(Array.isArray(value) ? value.join('') : String(value));
    if (!unicode) return originalText(value, ...args);
    const previous = doc.getFont();
    doc.setFont('NotoDevanagari', 'normal');
    const result = originalText(value, ...args);
    doc.setFont(previous.fontName, previous.fontStyle);
    return result;
  };
  return true;
}
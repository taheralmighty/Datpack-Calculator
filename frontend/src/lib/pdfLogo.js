import logoSrc from '../assets/logo-copper.png';

let cached;
export function loadPDFLogo(src = logoSrc) {
  if (src === logoSrc && cached) return cached;
  const loading = new Promise(resolve => {
    const image = new Image();
    const finish = result => { clearTimeout(timer); image.onload = null; image.onerror = null; resolve(result); };
    const timer = setTimeout(() => finish(null), 5000);
    image.onload = () => {
      try {
        const scale = Math.min(1, 180 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        finish({ data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
      } catch { finish(null); }
    };
    image.onerror = () => finish(null);
    image.src = src;
  });
  if (src === logoSrc) {
    cached = loading;
    loading.then(result => { if (!result) cached = null; });
  }
  return loading;
}
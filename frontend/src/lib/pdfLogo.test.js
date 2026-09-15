let images;
let originalImage;
beforeEach(() => {
  jest.resetModules(); jest.useFakeTimers(); images = []; originalImage = global.Image;
  global.Image = class {
    constructor() { this.naturalWidth = 1815; this.naturalHeight = 2260; images.push(this); }
    set src(value) { this.url = value; this.handlersInstalled = !!this.onload && !!this.onerror; }
  };
});
afterEach(() => { global.Image = originalImage; jest.useRealTimers(); jest.restoreAllMocks(); });

test('logo installs handlers before loading, resizes proportionately and caches success', async () => {
  const drawImage = jest.fn();
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,logo');
  const { loadPDFLogo } = require('./pdfLogo');
  const loading = loadPDFLogo();
  expect(images[0].handlersInstalled).toBe(true);
  images[0].onload();
  const result = await loading;
  expect(result.height).toBe(180);
  expect(result.width).toBe(145);
  expect(drawImage).toHaveBeenCalled();
  expect(await loadPDFLogo()).toEqual(result);
  expect(images).toHaveLength(1);
});

test('missing, corrupt and timed-out images do not block export indefinitely', async () => {
  const { loadPDFLogo } = require('./pdfLogo');
  const missing = loadPDFLogo('missing'); images[0].onerror(); expect(await missing).toBeNull();
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('bad image'); });
  const corrupt = loadPDFLogo('corrupt'); images[1].onload(); expect(await corrupt).toBeNull();
  const timeout = loadPDFLogo('timeout'); jest.advanceTimersByTime(5000); expect(await timeout).toBeNull();
});

class BarcodeScanner {
  constructor(videoElementId, onScanSuccess) {
    this.videoElement = document.getElementById(videoElementId);
    this.onScanSuccess = onScanSuccess;
    this.codeReader = new ZXing.BrowserMultiFormatReader();
    this.isScanning = false;
  }

  async start() {
    if (this.isScanning) return;

    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.classList.remove('hidden');

    try {
      // iOS WebKit compatible camera constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      this.isScanning = true;

      // Start decoding from video device with fallback
      await this.codeReader.decodeFromConstraints(
        constraints,
        this.videoElement,
        (result, err) => {
          if (result && this.isScanning) {
            this.stop();
            this.onScanSuccess(result.getText());
          }
        }
      );
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. On iPhone, please try opening this app in Safari or check iOS Settings > Chrome > Camera permissions.');
      this.stop();
    }
  }

  stop() {
    this.isScanning = false;
    this.codeReader.reset();
    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

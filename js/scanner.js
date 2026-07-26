class BarcodeScanner {
  constructor(videoElementId, onScanCallback) {
    this.videoElement = document.getElementById(videoElementId);
    this.overlayElement = document.getElementById('scanner-overlay');
    this.onScanCallback = onScanCallback;
    this.isScanning = false;
    this.stream = null;
    this.animationFrameId = null;

    this.hasNativeSupport = 'BarcodeDetector' in window;
    if (this.hasNativeSupport) {
      this.nativeDetector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] });
    } else {
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A
      ]);
      this.codeReader = new ZXing.BrowserMultiFormatReader(hints, 100);
    }
  }

  async start() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          focusMode: { ideal: 'continuous' }
        }
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      if (this.overlayElement) {
        this.overlayElement.classList.remove('hidden');
      }

      if (this.hasNativeSupport) {
        this.scanNativeLoop();
      } else {
        this.scanZXing();
      }
    } catch (err) {
      console.error('Camera Scanner Error:', err);
      this.isScanning = false;
      alert('Unable to start camera. Please ensure HTTPS and permissions are allowed.');
    }
  }

  async scanNativeLoop() {
    if (!this.isScanning) return;

    try {
      const barcodes = await this.nativeDetector.detect(this.videoElement);
      if (barcodes.length > 0 && this.isScanning) {
        this.isScanning = false;
        const text = barcodes[0].rawValue;
        this.stop();
        this.onScanCallback(text);
        return;
      }
    } catch (e) {}

    if (this.isScanning) {
      this.animationFrameId = requestAnimationFrame(() => this.scanNativeLoop());
    }
  }

  scanZXing() {
    this.codeReader.decodeFromVideoElement(this.videoElement, (result, err) => {
      if (result && this.isScanning) {
        this.isScanning = false;
        const text = result.getText();
        this.stop();
        this.onScanCallback(text);
      }
    });
  }

  stop() {
    this.isScanning = false;

    if (this.overlayElement) {
      this.overlayElement.classList.add('hidden');
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.codeReader) {
      try {
        this.codeReader.reset();
      } catch (e) {}
    }
  }
}
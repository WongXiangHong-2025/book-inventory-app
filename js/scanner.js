class BarcodeScanner {
  constructor(videoElementId, onScanSuccess) {
    this.videoElement = document.getElementById(videoElementId);
    this.onScanSuccess = onScanSuccess;
    this.codeReader = new ZXing.BrowserMultiFormatReader();
    this.isScanning = false;
  }

  async start() {
    if (this.isScanning) return;

    // 1. Reset any existing stream connections
    this.stop();

    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.classList.remove('hidden');

    try {
      this.isScanning = true;

      // 2. Ensure video element has proper inline attributes
      if (this.videoElement) {
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('webkit-playsinline', 'true');
        this.videoElement.muted = true;
      }

      // 3. Android Chrome camera resolution and auto-focus constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          focusMode: { ideal: 'continuous' }
        }
      };

      // 4. Start decoding video stream
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
      console.error('Camera stream error:', err);
      // Fallback for devices that reject strict constraints
      this.startFallback();
    }
  }

  // Fallback stream for older Android devices or strict browser permissions
  async startFallback() {
    try {
      await this.codeReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        this.videoElement,
        (result, err) => {
          if (result && this.isScanning) {
            this.stop();
            this.onScanSuccess(result.getText());
          }
        }
      );
    } catch (fallbackErr) {
      console.error('Fallback camera error:', fallbackErr);
      alert('Unable to access camera on Chrome. Please ensure camera permissions are allowed in site settings.');
      this.stop();
    }
  }

  stop() {
    this.isScanning = false;

    // Release camera tracks cleanly
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject;
      if (stream.getTracks) {
        stream.getTracks().forEach(track => track.stop());
      }
      this.videoElement.srcObject = null;
    }

    if (this.codeReader) {
      this.codeReader.reset();
    }

    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

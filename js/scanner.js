class BarcodeScanner {
  constructor(videoElementId, onScanSuccess) {
    this.videoElement = document.getElementById(videoElementId);
    this.onScanSuccess = onScanSuccess;
    this.codeReader = new ZXing.BrowserMultiFormatReader();
    this.isScanning = false;
  }

  async start() {
    if (this.isScanning) return;

    // 1. Force stop and release any existing camera stream (Crucial for iOS WebKit)
    this.stop();

    const overlay = document.getElementById('scanner-overlay');
    if (overlay) overlay.classList.remove('hidden');

    try {
      this.isScanning = true;

      // 2. iOS & Android cross-compatible camera constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }
        }
      };

      // 3. Ensure iOS inline playback attributes are set on the video tag
      if (this.videoElement) {
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('webkit-playsinline', 'true');
        this.videoElement.muted = true;
      }

      // 4. Start stream decoding across devices
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
      alert('Camera access failed.\n\n• On iPhone: Make sure camera access is allowed in Settings > Chrome/Safari > Camera.\n• Try opening the link in Safari on iOS if issue persists.');
      this.stop();
    }
  }

  stop() {
    this.isScanning = false;

    // Explicitly stop all hardware media tracks to unlock camera on iOS & Android
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

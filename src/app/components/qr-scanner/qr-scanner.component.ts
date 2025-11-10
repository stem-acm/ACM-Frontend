import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.css'
})
export class QrScannerComponent implements OnInit, AfterViewInit, OnDestroy {
  scannerEnabled = true;
  qrResultString: string = '';
  availableDevices: any[] = [];
  currentDeviceId: string = '';
  private html5QrCode: Html5Qrcode | null = null;
  isScanning = false;

  // track whether the view is ready and store a pending device id if cameras resolve before/after view init
  private viewInitialized = false;
  private pendingDeviceId: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}
  
  async ngOnInit() {
    try {
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        this.availableDevices = devices;
        
        console.log('Available cameras:', devices.map(d => ({ 
          id: d.id, 
          label: d.label 
        })));

        // Filter out infrared and special cameras
        const normalCameras = devices.filter(device => {
          const label = device.label.toLowerCase();
          
          const excludeKeywords = [
            'infrared',
            'ir camera',
            'depth',
            'windows hello',
            'virtual',
            'obs',
            'ir'
          ];
          
          return !excludeKeywords.some(keyword => label.includes(keyword));
        });

        console.log('Filtered normal cameras:', normalCameras.map(d => d.label));

        let selectedCamera;

        // Detect if device is iPad/tablet
        const isIPad = /iPad|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;
        const isTablet = /tablet|ipad|playbook|silk/i.test(navigator.userAgent);
        const isMobile = isIPad || isTablet || /Mobile|Android/i.test(navigator.userAgent);

        if (normalCameras.length > 0) {
          if (isMobile) {
            // On iPad/mobile: prefer front/user-facing camera
            selectedCamera = normalCameras.find(d => {
              const label = d.label.toLowerCase();
              return label.includes('front') || 
                     label.includes('user') || 
                     label.includes('facetime');
            }) || normalCameras[0];
            console.log('Mobile/iPad detected - using front camera');
          } else {
            // On laptop: prefer HD camera
            selectedCamera = normalCameras.find(d => 
              d.label.toLowerCase().includes('hd')
            ) || normalCameras[0];
            console.log('Laptop detected - using HD camera');
          }
        } else {
          selectedCamera = devices[0];
        }

        this.currentDeviceId = selectedCamera.id;
        console.log('Selected camera:', selectedCamera.label);
        this.cdr.detectChanges();

        // If the view is already initialized, start scanning immediately.
        // Otherwise store the device id to start scanning once the view is ready.
        if (this.viewInitialized) {
          // small delay to ensure qr-reader element is rendered
          setTimeout(() => this.startScanning(this.currentDeviceId), 100);
        } else {
          this.pendingDeviceId = this.currentDeviceId;
        }
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
    }
  }

  ngAfterViewInit() {
    // mark view as initialized and start scanning if there is a pending device
    this.viewInitialized = true;
    if (this.pendingDeviceId) {
      const deviceId = this.pendingDeviceId;
      this.pendingDeviceId = null;
      // small delay to allow Angular to render the scanner container
      setTimeout(() => this.startScanning(deviceId), 100);
    }
  }

  async startScanning(deviceId: string) {
    try {
      if (this.isScanning) {
        await this.stopScanning();
      }

      // Check if element exists
      const element = document.getElementById('qr-reader');
      if (!element) {
        console.error('qr-reader element not found');
        return;
      }

      this.html5QrCode = new Html5Qrcode('qr-reader');
      
      await this.html5QrCode.start(
        deviceId,
        {
          fps: 10,
          qrbox: { width: 500, height: 500 },
          aspectRatio: 1 // 16:9 aspect ratio for better compatibility
        },
        (decodedText, decodedResult) => {
          this.onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Scanning errors are common and can be ignored
        }
      );

      this.isScanning = true;
      console.log('Scanner started successfully');
    } catch (err) {
      console.error('Error starting scanner:', err);
    }
  }

  async stopScanning() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
        this.isScanning = false;
        this.html5QrCode = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }

  onScanSuccess(decodedText: string) {
    this.qrResultString = decodedText;
    this.scannerEnabled = false;
    this.stopScanning();
  }

  async onDeviceSelectChange(event: Event) {
    const selectedDeviceId = (event.target as HTMLSelectElement).value;
    this.currentDeviceId = selectedDeviceId;
    await this.startScanning(selectedDeviceId);
  }

  async scanAgain() {
    this.qrResultString = '';
    this.scannerEnabled = true;
    this.cdr.detectChanges();
    
    // Wait for Angular to render the element
    setTimeout(async () => {
      await this.startScanning(this.currentDeviceId);
    }, 200);
  }

  ngOnDestroy() {
    this.stopScanning();
  }
}
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { BrowserMultiFormatReader, Result } from '@zxing/library';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.css'],
  imports: [CommonModule],
  standalone: true,
})
export class ScannerComponent implements OnInit, OnDestroy {
  @ViewChild('video', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;

  @Input() scanZoneWidth = '500px';
  @Input() scanZoneHeight = '500px';
  @Input() borderColor = '#FF0000';
  @Output() scanComplete = new EventEmitter<string>();

  codeReader = new BrowserMultiFormatReader();
  scanning = false;
  result: string | null = null;
  currentDeviceId: string | null = null;

  async ngOnInit() {
    await this.startScan();
  }

  async startScan() {
    try {
      const devices = await this.codeReader.listVideoInputDevices();
      if (devices.length === 0) {
        throw new Error('No camera devices found.');
      }

      const frontCamera =
        devices.find(
          d => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('user'),
        ) || devices[0];
      this.currentDeviceId = frontCamera.deviceId;

      (this.codeReader as unknown as { timeBetweenScansMillis: number }).timeBetweenScansMillis = 0;

      this.videoElement.nativeElement.style.transform = 'scaleX(-1)';

      this.codeReader.decodeFromVideoDevice(
        this.currentDeviceId,
        this.videoElement.nativeElement,
        (res: Result | undefined) => {
          if (res) {
            this.result = res.getText();
            console.log('QR Code detected:', this.result);
            this.scanComplete.emit(this.result);
            this.pauseScan();
          }
        },
      );

      this.scanning = true;
    } catch (err) {
      console.error('Error initializing camera:', err);
    }
  }

  pauseScan() {
    this.codeReader.reset();
    this.scanning = false;
  }

  async resumeScan() {
    if (this.currentDeviceId) {
      this.result = null;
      (this.codeReader as unknown as { timeBetweenScansMillis: number }).timeBetweenScansMillis = 0;
      this.codeReader.decodeFromVideoDevice(
        this.currentDeviceId,
        this.videoElement.nativeElement,
        (res: Result | undefined) => {
          if (res) {
            this.result = res.getText();
            this.scanComplete.emit(this.result);
            this.pauseScan();
          }
        },
      );
      this.scanning = true;
    } else {
      await this.startScan();
    }
  }

  ngOnDestroy() {
    this.codeReader.reset();
  }
}

import { Component, Input } from '@angular/core';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [],
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.css',
})
export class QrCodeComponent {
  qrUrl = '';
  generationFailed = false;
  private generation = 0;

  @Input() set data(value: string | null | undefined) {
    const generation = ++this.generation;
    this.qrUrl = '';
    this.generationFailed = false;
    if (!value) {
      return;
    }

    // Keep the signed payload local, with a quiet zone and extra error correction for print.
    void toDataURL(value, { width: 448, margin: 4, errorCorrectionLevel: 'Q' })
      .then(url => {
        if (generation === this.generation) {
          this.qrUrl = url;
        }
      })
      .catch(() => {
        if (generation === this.generation) {
          this.generationFailed = true;
        }
      });
  }
}

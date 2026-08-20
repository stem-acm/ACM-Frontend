import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [],
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.css',
})
export class QrCodeComponent {
  @Input() data!: string;

  get qrUrl(): string {
    if (!this.data) {
      return '';
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(this.data)}`;
  }
}

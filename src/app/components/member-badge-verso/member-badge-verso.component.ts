import { Component, Input } from '@angular/core';
import { AcmLogoComponent } from '@/app/components/acm-logo/acm-logo.component';
import { QrCodeComponent } from '@/app/components/qr-code/qr-code.component';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-member-badge-verso',
  standalone: true,
  imports: [AcmLogoComponent, QrCodeComponent],
  templateUrl: './member-badge-verso.component.html',
  styleUrl: './member-badge-verso.component.css',
})
export class MemberBadgeVersoComponent {
  @Input() registrationNumber!: string;
  private URL: string = environment.STATIC_WEB_URL;

  getLink(): string {
    return `${this.URL}/member?reg=${this.registrationNumber}`;
  }
}

import { Component } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import { QrCodeComponent } from '../qr-code/qr-code.component';

@Component({
  selector: 'app-member-badge-verso',
  standalone: true,
  imports: [AcmLogoComponent, QrCodeComponent],
  templateUrl: './member-badge-verso.component.html',
  styleUrl: './member-badge-verso.component.css'
})
export class MemberBadgeVersoComponent {

}

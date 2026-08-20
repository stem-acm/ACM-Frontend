import { Component, inject, Input, OnInit } from '@angular/core';
import { AcmLogoComponent } from '@/app/components/acm-logo/acm-logo.component';
import { QrCodeComponent } from '@/app/components/qr-code/qr-code.component';
import { MemberService } from '@/app/services/member.service';

@Component({
  selector: 'app-member-badge-verso',
  standalone: true,
  imports: [AcmLogoComponent, QrCodeComponent],
  templateUrl: './member-badge-verso.component.html',
  styleUrl: './member-badge-verso.component.css',
})
export class MemberBadgeVersoComponent implements OnInit {
  @Input() registrationNumber!: string | null | undefined;

  qrData = '';

  private memberService = inject(MemberService);

  ngOnInit() {
    this.loadQRData();
  }

  private loadQRData() {
    if (!this.registrationNumber) {
      return;
    }

    const regNum = Number.parseInt(this.registrationNumber, 10);
    if (Number.isNaN(regNum)) {
      return;
    }

    this.memberService.getQRCodeData(regNum).subscribe(result => {
      if (result.success && result.data) {
        this.qrData = JSON.stringify(result.data);
      }
    });
  }
}

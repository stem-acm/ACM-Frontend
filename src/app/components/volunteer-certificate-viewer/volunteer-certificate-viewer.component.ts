import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import dayjs from 'dayjs';
import { environment } from '@/environments/environment';
import { Volunteer } from '@/app/interfaces/volunteer';

@Component({
  selector: 'app-volunteer-certificate-viewer',
  standalone: true,
  imports: [AcmLogoComponent],
  templateUrl: './volunteer-certificate-viewer.component.html',
  styleUrl: './volunteer-certificate-viewer.component.css',
})
export class VolunteerCertificateViewerComponent {
  private URL: string = environment.FILE_URL;
  public today = dayjs().format('DD/MM/YYYY');
  @Input() data!: Volunteer;
  @Output() canceled = new EventEmitter<boolean>();

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${(fileName ??= 'user.png')}`;
  }

  getYearOf(expirationDate: Date | null | undefined) {
    return dayjs(expirationDate).format('YYYY');
  }

  cancel() {
    this.canceled.emit(true);
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '@/environments/environment';
import { Volunteer } from '@/app/interfaces/volunteer';
import { VolunteerService } from '@/app/services/volunteer.service';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';

@Component({
  selector: 'app-volunteer-certificate-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AcmLogoComponent],
  templateUrl: './volunteer-certificate-viewer.component.html',
  styleUrl: './volunteer-certificate-viewer.component.css',
})
export class VolunteerCertificateViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private volunteerService = inject(VolunteerService);
  private fileUrl = environment.FILE_URL;

  data: Volunteer | null = null;
  loading = true;
  errorKey = '';
  submitted = false;
  private today = new Date();
  certificate = {
    title: 'VOLUNTEERING CERTIFICATE',
    reference: '',
    recipient: '',
    role: 'Volunteer',
    startDate: '',
    endDate: '',
    issueDate: `${this.today.getFullYear()}-${String(this.today.getMonth() + 1).padStart(2, '0')}-${String(this.today.getDate()).padStart(2, '0')}`,
    description:
      'For dedicated service at the American Corner Mahajanga, demonstrating enthusiasm, commitment, and a passion for promoting English language, cultural exchange, and community engagement.',
    activities: 'Engaging with visitors and promoting the mission of the American Corner',
    signatory: 'ANDRY RABENJAMINA',
    signatoryTitle: 'PROGRAM COORDINATOR',
    stamp: false,
    signature: false,
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.errorKey = 'Invalid volunteer ID.';
      this.loading = false;
      return;
    }
    this.volunteerService.getVolunteerById(id).subscribe({
      next: result => {
        if (
          result.success &&
          result.data?.Member?.registrationNumber != null &&
          result.data.id != null
        ) {
          this.data = result.data;
          this.certificate.reference = `ACM-M${result.data.Member.registrationNumber}-V${result.data.id}`;
          this.certificate.recipient = [result.data.Member.lastName, result.data.Member.firstName]
            .filter(Boolean)
            .join(' ');
          this.certificate.role = result.data.role || 'Volunteer';
          this.certificate.startDate = this.dateInput(result.data.joinDate);
          this.certificate.endDate = this.dateInput(result.data.expirationDate);
        } else {
          this.errorKey = 'Volunteer or linked member could not be found.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorKey = 'Could not load this volunteer. Please try again.';
        this.loading = false;
      },
    });
  }

  get activities(): string[] {
    return this.certificate.activities
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
  }

  get datesInvalid(): boolean {
    return (
      !!this.certificate.startDate &&
      !!this.certificate.endDate &&
      this.certificate.endDate < this.certificate.startDate
    );
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  asset(name: string): string {
    return `${this.fileUrl}/${name}`;
  }

  print(form: NgForm): void {
    this.submitted = true;
    if (!this.valid(form)) return;

    const content = document.getElementById('certificateSectionToPrint');
    if (!content) return;
    const printName = this.pdfFilename().slice(0, -4);
    const certificateHeight = Math.max(637, content.scrollHeight);
    const scale = Math.min((297 * 96) / 25.4 / 900, (210 * 96) / 25.4 / certificateHeight);
    const left = ((297 * 96) / 25.4 - 900 * scale) / 2;
    const top = ((210 * 96) / 25.4 - certificateHeight * scale) / 2;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', printName);
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const printWindow = iframe.contentWindow;
    const printDocument = printWindow?.document;
    if (!printWindow || !printDocument) {
      iframe.remove();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');
    printDocument.open();
    printDocument.write(`<!doctype html><html lang="en"><head><title>Certificate</title>${styles}<style>
      @page { size: 297mm 210mm; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; }
      .print-page { position: relative; width: 297mm; height: 210mm; overflow: hidden; }
      #certificateSectionToPrint {
        position: absolute !important;
        left: ${left}px !important;
        top: ${top}px !important;
        width: 900px !important;
        height: ${certificateHeight}px !important;
        min-height: 0 !important;
        max-width: none !important;
        margin: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
        transform: scale(${scale}) !important;
        transform-origin: top left !important;
        break-inside: avoid;
      }
    </style></head><body><div class="print-page">${content.outerHTML}</div></body></html>`);
    printDocument.close();
    printDocument.title = printName;

    const stylesheets = Array.from(
      printDocument.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    );
    const stylesheetLoads = stylesheets.map(link =>
      link.sheet
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            link.onload = () => resolve();
            link.onerror = () => resolve();
          }),
    );
    const images = Array.from(printDocument.images);
    const imageLoads = images.map(image =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          }),
    );
    Promise.all([...stylesheetLoads, ...imageLoads])
      .then(() => printDocument.fonts.ready)
      .then(() => {
        printWindow.addEventListener('afterprint', () => iframe.remove(), { once: true });
        printWindow.focus();
        printWindow.print();
        setTimeout(() => iframe.remove(), 60000);
      });
  }

  private dateInput(value: Date | string | null | undefined): string {
    return value ? String(value).slice(0, 10) : '';
  }
  private valid(form: NgForm): boolean {
    return (
      !form.invalid &&
      !!this.certificate.reference &&
      !this.datesInvalid &&
      !!this.activities.length
    );
  }

  private pdfFilename(): string {
    const name =
      this.certificate.recipient
        .trim()
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/, '')
        .slice(0, 120) || `Volunteer-${this.data?.id}`;
    return `CERT-${name}.pdf`;
  }
}

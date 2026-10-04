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
        if (result.success && result.data?.Member) {
          this.data = result.data;
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
    if (form.invalid || this.datesInvalid || !this.activities.length) return;
    const content = document.getElementById('certificateSectionToPrint');
    if (!content) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Certificate print');
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
    printDocument.write(`<!doctype html><html><head><title>Volunteer certificate</title>${styles}<style>
      @page { size: A4 landscape; margin: 10mm; }
      @media print { body { margin: 0; } #certificateSectionToPrint { width: 100%; max-width: none; min-height: 180mm; box-shadow: none; transform: none !important; } }
    </style></head><body>${content.outerHTML}</body></html>`);
    printDocument.close();
    const images = Array.from(printDocument.images);
    Promise.all(
      images.map(image =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              image.onload = () => resolve();
              image.onerror = () => resolve();
            }),
      ),
    ).then(() => {
      printWindow.addEventListener('afterprint', () => iframe.remove(), { once: true });
      printWindow.focus();
      printWindow.print();
      setTimeout(() => iframe.remove(), 60000);
    });
  }

  private dateInput(value: Date | string | null | undefined): string {
    return value ? String(value).slice(0, 10) : '';
  }
}

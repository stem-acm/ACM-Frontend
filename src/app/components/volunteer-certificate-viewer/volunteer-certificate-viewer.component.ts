import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import dayjs from 'dayjs';
import { environment } from '@/environments/environment';
import { Volunteer } from '@/app/interfaces/volunteer';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-volunteer-certificate-viewer',
  standalone: true,
  imports: [AcmLogoComponent, FormsModule, CommonModule],
  templateUrl: './volunteer-certificate-viewer.component.html',
  styleUrl: './volunteer-certificate-viewer.component.css',
})
export class VolunteerCertificateViewerComponent {
  private URL: string = environment.FILE_URL;
  public today = dayjs().format('DD/MM/YYYY');
  @Input() data!: Volunteer;
  @Output() canceled = new EventEmitter<boolean>();
  public checkData: { stamp: boolean; signature: boolean } = { stamp: false, signature: false };

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${(fileName ??= 'user.png')}`;
  }

  getYearOf(expirationDate: Date | null | undefined) {
    return dayjs(expirationDate).format('YYYY');
  }

  cancel() {
    this.canceled.emit(true);
  }

  print() {
    this.openPDF();
  }

  openPDF() {
    const content = document.getElementById('certificateSectionToPrint')?.cloneNode(true);
    if (!content) return;

    const iframe = document.createElement('iframe');
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframeWin?.document;
    if (!iframeDoc) return;

    iframeDoc.open();

    // Build styles HTML
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => {
        if (node.tagName === 'LINK') {
          const href = (node as HTMLLinkElement).href;
          return `<link rel="stylesheet" href="${href}">`;
        }
        return node.outerHTML;
      })
      .join('\n');

    // Get the content HTML
    const contentHtml = (content as HTMLElement).outerHTML;

    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          ${styles}
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Attendre les images
    const waitImagesLoaded = () => {
      const imgs = Array.from(iframeDoc.images);
      if (!imgs.length) return Promise.resolve();

      let loaded = 0;
      return new Promise<void>(resolve => {
        for (const img of imgs) {
          if (img.complete) {
            loaded++;
            if (loaded === imgs.length) resolve();
          } else {
            img.onload = () => {
              loaded++;
              if (loaded === imgs.length) resolve();
            };
            img.onerror = () => {
              loaded++;
              if (loaded === imgs.length) resolve();
            };
          }
        }
      });
    };

    waitImagesLoaded().then(() => {
      iframeWin?.focus();
      iframeWin?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    });
  }
}

import { ZardButtonComponent } from '@/shared/components/button';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '@/app/interfaces/member';
import { MemberBadgeComponent } from '@/app/components/member-badge/member-badge.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-card-viewer',
  standalone: true,
  imports: [ZardButtonComponent, MemberBadgeComponent, FormsModule],
  templateUrl: './member-card-viewer.component.html',
  styleUrl: './member-card-viewer.component.css',
})
export class MemberCardViewerComponent {
  @Input() member!: Member[];
  @Output() closed = new EventEmitter<boolean>();
  public checkData: { stamp: boolean; signature: boolean } = { stamp: false, signature: false };

  get memberPages(): Member[][] {
    const pages: Member[][] = [];
    for (let i = 0; i < (this.member?.length ?? 0); i += 4) {
      pages.push(this.member.slice(i, i + 4));
    }
    return pages;
  }

  close() {
    this.closed.emit(true);
  }

  print() {
    // window.print();
    this.openPDF();
  }

  openPDF() {
    const content = document.getElementById('badgeSectionToPrint')?.cloneNode(true);
    if (!content) return;

    const iframe = document.createElement('iframe');
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframeWin?.document;
    if (!iframeDoc) {
      iframe.remove();
      return;
    }

    iframeDoc.open();

    // Copier les styles Tailwind + Angular correctement
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => {
        if (node.tagName === 'LINK') {
          const href = (node as HTMLLinkElement).href; // URL absolue
          return `<link rel="stylesheet" href="${href}">`;
        }
        return node.outerHTML;
      })
      .join('\n');

    const contentHtml = (content as HTMLElement).outerHTML;

    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            html, body { margin: 0; padding: 0; }
            #badgeSectionToPrint { border: 0; padding: 0; }
            .badge-print-page {
              width: 190mm;
              height: 276mm;
              display: grid;
              grid-template-rows: repeat(4, 66mm);
              gap: 3mm;
              justify-items: center;
              break-after: page;
              break-inside: avoid;
            }
            .badge-print-page:last-child { break-after: auto; }
            .badge-print-page > app-member-badge { display: block; zoom: 0.72; }
            .badge-pair { margin: 0; break-inside: avoid; }
            .badge-pair > * > div { box-shadow: none; }
          </style>
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
      const cleanup = () => {
        clearTimeout(cleanupTimer);
        iframeWin?.removeEventListener('afterprint', cleanup);
        iframe.remove();
      };

      iframeWin?.addEventListener('afterprint', cleanup, { once: true });
      const cleanupTimer = setTimeout(cleanup, 120_000);
      iframeWin?.focus();
      iframeWin?.print();
    });
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '@/app/interfaces/member';
import { MemberBadgeComponent } from '@/app/components/member-badge/member-badge.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-card-viewer',
  standalone: true,
  imports: [MemberBadgeComponent, FormsModule],
  templateUrl: './member-card-viewer.component.html',
  styleUrl: './member-card-viewer.component.css',
})
export class MemberCardViewerComponent {
  @Input() member!: Member[];
  @Output() closed = new EventEmitter<boolean>();
  public checkData: { stamp: boolean; signature: boolean } = { stamp: false, signature: false };

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

    // Using document.write() after document.open() is the correct approach for iframes
    // The browser warning is about using write() during page load, not when explicitly opening
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

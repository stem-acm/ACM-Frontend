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
    iframe.style.position = 'absolute';
    iframe.style.width = '210mm'; // Set to A4 width for correct centering calculations
    iframe.style.height = '297mm'; // Set to A4 height
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.visibility = 'hidden'; // Use visibility hidden instead of just off-screen to be safe
    document.body.appendChild(iframe);

    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframeWin?.document;
    if (!iframeDoc || !iframeWin) return;

    // Use standard DOM methods instead of document.write to avoid violations
    const title = iframeDoc.createElement('title');
    title.textContent = 'Print';
    iframeDoc.head.appendChild(title);

    const pageStyle = iframeDoc.createElement('style');
    pageStyle.textContent = `
      @page { size: A4 portrait; margin: 0; }
      body { 
        margin: 0; 
        width: 100%;
        height: 100%;
      }
      #badgeSectionToPrint {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 0;
        width: 100%;
        margin: 0 auto;
        transform: scale(0.95); /* Slight scale to ensure margins and fit */
        transform-origin: top center;
      }
      app-member-badge {
        display: block;
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 2mm;
      }
    `;
    iframeDoc.head.appendChild(pageStyle);

    // Copy styles from parent document
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    styles.forEach((node) => {
      const cloned = node.cloneNode(true) as HTMLElement;
      if (node.tagName === 'LINK') {
        (cloned as HTMLLinkElement).href = (node as HTMLLinkElement).href;
      }
      iframeDoc.head.appendChild(cloned);
    });

    iframeDoc.body.appendChild(content);

    // Function to wait for images
    const waitImagesLoaded = () => {
      const imgs = Array.from(iframeDoc.images);
      const promises = imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });
      return Promise.all(promises);
    };

    waitImagesLoaded().then(() => {
      // Small delay to ensure styles are applied and rendering is complete
      setTimeout(() => {
        iframeWin.focus();
        iframeWin.print();

        // Cleanup after print dialog allows execution to resume
        // Note: print() is blocking in many browsers, but we use a short timeout to be safe
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    });
  }
}

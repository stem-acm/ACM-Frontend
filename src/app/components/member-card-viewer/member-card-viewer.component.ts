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

  async openPDF() {
    const section = document.getElementById('badgeSectionToPrint');
    if (!section) return;

    // Convert all images to data URLs with proper CORS handling
    const images = Array.from(section.querySelectorAll('img')) as HTMLImageElement[];
    const imageConversions = images.map(async (img) => {
      try {
        // Create a new image with crossOrigin to avoid tainted canvas
        const corsImage = new Image();
        corsImage.crossOrigin = 'anonymous';
        
        // Wait for the image to load
        await new Promise<void>((resolve, reject) => {
          corsImage.onload = () => resolve();
          corsImage.onerror = () => reject(new Error('Image load failed'));
          corsImage.src = img.src;
        });

        // Now we can safely draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = corsImage.naturalWidth || corsImage.width;
        canvas.height = corsImage.naturalHeight || corsImage.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(corsImage, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          img.setAttribute('data-original-src', img.src);
          img.src = dataUrl;
        }
      } catch (e) {
        console.error('Failed to convert image:', img.src, e);
        // Keep original src if conversion fails
      }
    });

    await Promise.all(imageConversions);

    // Now clone the content with converted images
    const content = section.cloneNode(true);

    // Restore original src attributes
    images.forEach((img) => {
      const originalSrc = img.getAttribute('data-original-src');
      if (originalSrc) {
        img.src = originalSrc;
        img.removeAttribute('data-original-src');
      }
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '-10000px';
    iframe.style.width = '1000px';
    iframe.style.height = '1000px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframeWin?.document;
    if (!iframeDoc || !iframeWin) return;

    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 500);
    };

    iframeWin.onafterprint = cleanup;

    const title = iframeDoc.createElement('title');
    title.textContent = 'Print';
    iframeDoc.head.appendChild(title);

    const pageStyle = iframeDoc.createElement('style');
    pageStyle.textContent = `
      @page { size: A4 portrait; margin: 0; }
      body { 
        margin: 0; 
        width: 210mm;
        height: 297mm;
        overflow: hidden;
      }
      #badgeSectionToPrint {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 0;
        width: 100%;
        margin: 0 auto;
        transform: scale(0.95);
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

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    styles.forEach((node) => {
      const cloned = node.cloneNode(true) as HTMLElement;
      if (node.tagName === 'LINK') {
        (cloned as HTMLLinkElement).href = (node as HTMLLinkElement).href;
      }
      iframeDoc.head.appendChild(cloned);
    });

    iframeDoc.body.appendChild(content);

    // Images are already data URLs, no need to wait
    setTimeout(() => {
      try {
        iframeWin.focus();
        iframeWin.print();
      } catch (e) {
        console.error('Print failed:', e);
        cleanup();
      }
    }, 250);
  }
}

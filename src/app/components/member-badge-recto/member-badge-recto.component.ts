import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { TextCursiveComponent } from '@/app/components/text-cursive/text-cursive.component';
import { Member } from '@/app/interfaces/member';
import dayjs from 'dayjs';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-member-badge-recto',
  standalone: true,
  imports: [TextCursiveComponent],
  templateUrl: './member-badge-recto.component.html',
  styleUrl: './member-badge-recto.component.css',
})
export class MemberBadgeRectoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('addressText') addressText!: ElementRef<HTMLElement>;
  private addressObserver?: ResizeObserver;
  private destroyed = false;

  ngAfterViewInit() {
    this.addressObserver = new ResizeObserver(() => this.fitAddress());
    this.addressObserver.observe(this.addressText.nativeElement.parentElement!);
    document.fonts.ready.then(() => this.fitAddress());
    this.fitAddress();
  }

  ngOnChanges() {
    if (this.addressText) queueMicrotask(() => this.fitAddress());
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.addressObserver?.disconnect();
  }

  private fitAddress() {
    if (this.destroyed) return;
    const text = this.addressText.nativeElement;
    const container = text.parentElement!;
    const availableWidth =
      container.clientWidth - parseFloat(getComputedStyle(container).paddingLeft);
    if (availableWidth <= 0) return;
    text.style.fontSize = 'small';
    const width = text.getBoundingClientRect().width;
    if (width > availableWidth) {
      const normalSize = parseFloat(getComputedStyle(text).fontSize);
      text.style.fontSize = `${normalSize * (availableWidth / width) * 0.98}px`;
    }
  }

  @Input() member!: Member;
  private URL: string = environment.FILE_URL;
  @Input() checkData!: { stamp: boolean; signature: boolean };

  formatDate(date?: Date | string) {
    if (!date) return 'no date';
    return dayjs(date).format('DD / MM / YYYY');
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }
}

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

  ngOnChanges() {
    if (this.addressText) queueMicrotask(() => this.fitAddress());
  }

  ngAfterViewInit() {
    const container = this.addressText.nativeElement.parentElement!;
    this.addressObserver = new ResizeObserver(() => this.fitAddress());
    this.addressObserver.observe(container);
    document.fonts.ready.then(() => this.fitAddress());
    this.fitAddress();
  }

  ngOnDestroy() {
    this.addressObserver?.disconnect();
  }

  private fitAddress() {
    const text = this.addressText.nativeElement;
    const container = text.parentElement!;
    if (!container.clientWidth) return;
    let size = 13;
    text.style.fontSize = `${size}px`;
    while (text.scrollHeight > container.clientHeight && size > 1) {
      size -= 0.5;
      text.style.fontSize = `${size}px`;
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

import { Component, Input } from '@angular/core';
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
export class MemberBadgeRectoComponent {
  @Input() member!: Member;
  private URL: string = environment.FILE_URL;
  @Input() checkData!: { stamp: boolean; signature: boolean };

  formatDate(date?: Date | string) {
    if (!date) return 'no date';
    return dayjs(date).format('DD / MM / YYYY');
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${(fileName ??= 'user.png')}`;
  }
}

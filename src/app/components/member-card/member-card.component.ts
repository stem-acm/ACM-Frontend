import { Component, Input } from '@angular/core';
import { Member } from '../../interfaces/member';
import { environment } from '../../../environments/environment.development';
import dayjs from 'dayjs';
import { ImgRoundComponent } from '../img-round/img-round.component';
import { TitleComponent } from '../title/title.component';
import { TextDescriptionComponent } from '../text-description/text-description.component';
import { MemberDescriptionComponent } from '../member-description/member-description.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [ImgRoundComponent, TitleComponent, TextDescriptionComponent, MemberDescriptionComponent, CommonModule],
  templateUrl: './member-card.component.html',
  styleUrl: './member-card.component.css'
})
export class MemberCardComponent {
  @Input() member!: Member;
  private URL: string = environment.FILEURL;

  formatDate(date?: Date | string) {
    return dayjs(date).format('dddd DD MMMM YYYY');
  }

  getfileUrl(fileName: any) {
    return `${this.URL}/${fileName ??= 'user.png'}`;
  }
}

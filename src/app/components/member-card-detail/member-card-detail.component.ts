import { Component, Input } from '@angular/core';
import { Member } from '../../interfaces/member';
import { ImgRoundComponent } from '../img-round/img-round.component';
import { TitleComponent } from '../title/title.component';
import { TextDescriptionComponent } from '../text-description/text-description.component';
import { MemberDescriptionComponent } from '../member-description/member-description.component';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment.development';
import dayjs from 'dayjs';
import { ListValueComponent } from '../list-value/list-value.component';
import { AddMemberComponent } from '../add-member/add-member.component';
import { AppComponent } from '../../app.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-member-card-detail',
  standalone: true,
  imports: [ImgRoundComponent, TitleComponent, TextDescriptionComponent, MemberDescriptionComponent, CommonModule, ListValueComponent, AddMemberComponent, RouterModule],
  templateUrl: './member-card-detail.component.html',
  styleUrl: './member-card-detail.component.css'
})
export class MemberCardDetailComponent {
  @Input() member!: Member;
  private URL: string = environment.FILEURL;
  public showAddForm: boolean = false;

  constructor(private app: AppComponent) {}

  formatDate(date?: Date | string) {
    if (!date) return 'no date';
    const formatted = dayjs(date).format('dddd DD MMMM YYYY');
    const age = dayjs().diff(dayjs(date), 'year');
    return `${formatted} (${age} yrs)`;
  }

  getfileUrl(fileName: any) {
    return `${this.URL}/${fileName ??= 'user.png'}`;
  }

  cancelForm(event: any) {
    if(event) this.showAddForm = false;
    this.app.showToast('Canceled form...');
  }

  showToast(event: any) {
    if(event) this.showAddForm = false;
    this.app.showToast(event.message);
    this.member = event.data;
  }

  updateMember() {
    this.showAddForm = true;
  }

}

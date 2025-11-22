import { Component, inject, Input } from '@angular/core';
import { Member } from '@/app/interfaces/member';
import { ImgRoundComponent } from '../img-round/img-round.component';
import { TitleComponent } from '../title/title.component';
import { TextDescriptionComponent } from '../text-description/text-description.component';
import { MemberDescriptionComponent } from '../member-description/member-description.component';
import { CommonModule } from '@angular/common';
import { environment } from '@/environments/environment';
import dayjs from 'dayjs';
import { ListValueComponent } from '../list-value/list-value.component';
import { AddMemberComponent } from '../add-member/add-member.component';
import { AppComponent } from '@/app/app.component';
import { RouterModule } from '@angular/router';
import { MemberCardViewerComponent } from '../member-card-viewer/member-card-viewer.component';

@Component({
  selector: 'app-member-card-detail',
  standalone: true,
  imports: [
    ImgRoundComponent,
    TitleComponent,
    TextDescriptionComponent,
    MemberDescriptionComponent,
    CommonModule,
    ListValueComponent,
    AddMemberComponent,
    RouterModule,
    MemberCardViewerComponent,
  ],
  templateUrl: './member-card-detail.component.html',
  styleUrl: './member-card-detail.component.css',
})
export class MemberCardDetailComponent {
  @Input() member!: Member;
  private URL: string = environment.FILE_URL;
  public showAddForm = false;
  public showCard = false;
  private app = inject(AppComponent);

  formatDate(date?: Date | string) {
    if (!date) return 'no date';
    const formatted = dayjs(date).format('dddd DD MMMM YYYY');
    const age = dayjs().diff(dayjs(date), 'year');
    return `${formatted} (${age} yrs)`;
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  cancelForm(event: boolean) {
    if (event) this.showAddForm = false;
    this.app.showToast('Canceled form...');
  }

  showToast(event: { message: string; data: Member }) {
    if (event) this.showAddForm = false;
    this.app.showToast(event.message);
    this.member = event.data;
  }

  updateMember() {
    this.showAddForm = true;
  }

  close(_: boolean) {
    this.showCard = false;
  }

  open() {
    this.showCard = true;
  }
}

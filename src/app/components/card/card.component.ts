import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '../../interfaces/member';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  @Input() memberChoose!: { selected: boolean; member: Member };
  @Output() setSelectedMember = new EventEmitter<Member>();
  @Output() memberSelectionChange = new EventEmitter<{
    selected: boolean;
    member: Member;
  }>();

  private URL: string = environment.FILE_URL;

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${(fileName ??= 'user.png')}`;
  }

  openCard(_member: Member) {
    this.setSelectedMember.emit(_member);
  }

  onCheckboxChange(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.memberSelectionChange.emit({
      member: this.memberChoose.member,
      selected: isChecked,
    });
  }
}

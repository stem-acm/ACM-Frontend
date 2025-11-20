import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '../../interfaces/member';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css'
})
export class CardComponent {
  @Input() memberChoose!: { selected: boolean, member: Member };
  @Output('setSelectedMember') emiterMember = new EventEmitter<Member>();
  @Output('memberSelectionChange') emiterMemberSelectionChange = new EventEmitter<{ selected: boolean, member: Member }>();

  private URL: string = environment.FILE_URL;

  getfileUrl(fileName: any) {
    return `${this.URL}/${fileName ??= 'user.png'}`;
  }

  openCard(_member: Member) {
    this.emiterMember.emit(_member);
  }

  onCheckboxChange(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.emiterMemberSelectionChange.emit({
      member: this.memberChoose.member,
      selected: isChecked
    });
  }

}

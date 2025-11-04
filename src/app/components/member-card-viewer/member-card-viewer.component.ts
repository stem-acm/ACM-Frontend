import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '../../interfaces/member';
import { MemberBadgeComponent } from '../member-badge/member-badge.component';

@Component({
  selector: 'app-member-card-viewer',
  standalone: true,
  imports: [MemberBadgeComponent],
  templateUrl: './member-card-viewer.component.html',
  styleUrl: './member-card-viewer.component.css'
})
export class MemberCardViewerComponent {
  @Input() member!: Member;
  @Output('closed') emiterClose = new EventEmitter<boolean>();
  
  close() {
    this.emiterClose.emit(true);
  }

  print() {
    window.print();
  }

}

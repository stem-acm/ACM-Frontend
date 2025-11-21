import { Component, Input } from '@angular/core';
import { MemberBadgeRectoComponent } from '@/app/components/member-badge-recto/member-badge-recto.component';
import { MemberBadgeVersoComponent } from '@/app/components/member-badge-verso/member-badge-verso.component';
import { Member } from '@/app/interfaces/member';

@Component({
  selector: 'app-member-badge',
  standalone: true,
  imports: [MemberBadgeRectoComponent, MemberBadgeVersoComponent],
  templateUrl: './member-badge.component.html',
  styleUrl: './member-badge.component.css',
})
export class MemberBadgeComponent {
  @Input() member!: Member;
  @Input() checkData!: { stamp: boolean; signature: boolean };
}

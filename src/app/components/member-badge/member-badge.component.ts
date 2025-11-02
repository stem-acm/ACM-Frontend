import { Component } from '@angular/core';
import { MemberBadgeRectoComponent } from '../member-badge-recto/member-badge-recto.component';
import { MemberBadgeVersoComponent } from '../member-badge-verso/member-badge-verso.component';

@Component({
  selector: 'app-member-badge',
  standalone: true,
  imports: [MemberBadgeRectoComponent, MemberBadgeVersoComponent],
  templateUrl: './member-badge.component.html',
  styleUrl: './member-badge.component.css'
})
export class MemberBadgeComponent {

}

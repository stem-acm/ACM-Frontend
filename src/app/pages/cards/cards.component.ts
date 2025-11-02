import { Component } from '@angular/core';
import { MemberBadgeComponent } from '../../components/member-badge/member-badge.component';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [MemberBadgeComponent],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css'
})
export class CardsComponent {

}

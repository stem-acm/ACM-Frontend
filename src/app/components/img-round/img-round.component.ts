import { Component, Input } from '@angular/core';
import { BadgeComponent } from '../badge/badge.component';

@Component({
  selector: 'app-img-round',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './img-round.component.html',
  styleUrl: './img-round.component.css',
})
export class ImgRoundComponent {
  @Input() imgUrl!: string;
}

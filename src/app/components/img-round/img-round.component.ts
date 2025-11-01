import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-img-round',
  standalone: true,
  imports: [],
  templateUrl: './img-round.component.html',
  styleUrl: './img-round.component.css'
})
export class ImgRoundComponent {
  @Input() imgUrl!: string;
}

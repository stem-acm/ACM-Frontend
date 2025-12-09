import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../badge/badge.component';

@Component({
  selector: 'app-img-round',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './img-round.component.html',
  styleUrl: './img-round.component.css',
})
export class ImgRoundComponent {
  @Input() imgUrl!: string;
  @Input() isVolunteer!: boolean;
  @Input() isLoadingBadge = false;
  @Input() width = '48'; // Default to w-48 (192px)
  @Input() height = '48'; // Default to h-48 (192px)
}

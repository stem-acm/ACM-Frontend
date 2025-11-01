import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-description',
  standalone: true,
  imports: [],
  templateUrl: './member-description.component.html',
  styleUrl: './member-description.component.css'
})
export class MemberDescriptionComponent {
  @Input() text!: string;
}

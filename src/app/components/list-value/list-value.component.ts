import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-list-value',
  standalone: true,
  imports: [],
  templateUrl: './list-value.component.html',
  styleUrl: './list-value.component.css',
})
export class ListValueComponent {
  @Input() label!: string;
  @Input() value!: string;
}

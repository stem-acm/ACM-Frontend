import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-text-cursive',
  standalone: true,
  imports: [],
  templateUrl: './text-cursive.component.html',
  styleUrl: './text-cursive.component.css'
})
export class TextCursiveComponent {
  @Input() text!: string;
}

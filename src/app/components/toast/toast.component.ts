import { ZardButtonComponent } from '@/shared/components/button';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [ZardButtonComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  @Input() message!: string;
  @Output() closed = new EventEmitter<boolean>();

  close() {
    this.closed.emit(true);
  }
}

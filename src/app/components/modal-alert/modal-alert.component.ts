import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-alert.component.html',
  styleUrls: ['./modal-alert.component.css'],
})
export class ModalAlertComponent {
  @Input() isVisible = false;
  @Input() title = 'Alert';
  @Input() message = '';
  @Output() closeModal = new EventEmitter<void>();

  onClose() {
    this.closeModal.emit();
  }
}

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
  @Input() showCancel = false;
  @Input() confirmText = 'OK';
  @Input() cancelText = 'Cancel';
  @Output() closeModal = new EventEmitter<void>();
  @Output('close') close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onClose() {
    this.closeModal.emit();
    this.close.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }
}

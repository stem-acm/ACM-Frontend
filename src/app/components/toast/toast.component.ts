import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  @Input() message!: string;
  @Output('closed') emiterClose = new EventEmitter<boolean>();
  
  close() {
    this.emiterClose.emit(true);
  }
}

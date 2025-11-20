import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastSubject = new Subject<{ message: string; delay: number }>();
  public toast$ = this.toastSubject.asObservable();

  constructor() {}

  showToast(message: string, delay = 3000) {
    this.toastSubject.next({ message, delay });
  }
}

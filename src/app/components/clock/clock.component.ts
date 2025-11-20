// src/app/clock/clock.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clock.component.html',
  styleUrl: './clock.component.css',
})
export class ClockComponent {
  hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  minutes = Array.from({ length: 60 }, (_, i) => i);

  hour = new Date(Date.now()).getHours();
  minute = new Date(Date.now()).getMinutes();

  isDraggingHour = false;
  isDraggingMinute = false;

  get hourHandX(): number {
    const angle = ((this.hour % 12) + this.minute / 60) * 30 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 80;
  }

  get hourHandY(): number {
    const angle = ((this.hour % 12) + this.minute / 60) * 30 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 80;
  }

  get minuteHandX(): number {
    const angle = this.minute * 6 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 120;
  }

  get minuteHandY(): number {
    const angle = this.minute * 6 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 120;
  }

  getHourMarkX1(hour: number): number {
    const angle = hour * 30 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 170;
  }

  getHourMarkY1(hour: number): number {
    const angle = hour * 30 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 170;
  }

  getHourMarkX2(hour: number): number {
    const angle = hour * 30 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 190;
  }

  getHourMarkY2(hour: number): number {
    const angle = hour * 30 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 190;
  }

  getHourTextX(hour: number): number {
    const angle = hour * 30 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 145;
  }

  getHourTextY(hour: number): number {
    const angle = hour * 30 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 145;
  }

  getMinuteMarkX1(minute: number): number {
    if (minute % 5 === 0) return 0;
    const angle = minute * 6 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 180;
  }

  getMinuteMarkY1(minute: number): number {
    if (minute % 5 === 0) return 0;
    const angle = minute * 6 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 180;
  }

  getMinuteMarkX2(minute: number): number {
    if (minute % 5 === 0) return 0;
    const angle = minute * 6 - 90;
    return 200 + Math.cos((angle * Math.PI) / 180) * 190;
  }

  getMinuteMarkY2(minute: number): number {
    if (minute % 5 === 0) return 0;
    const angle = minute * 6 - 90;
    return 200 + Math.sin((angle * Math.PI) / 180) * 190;
  }

  startDraggingHour(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingHour = true;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
  }

  startDraggingMinute(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingMinute = true;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
  }

  onMouseMove = (event: MouseEvent): void => {
    if (this.isDraggingHour || this.isDraggingMinute) {
      this.updateTime(event.clientX, event.clientY);
    }
  };

  onTouchMove = (event: TouchEvent): void => {
    if (this.isDraggingHour || this.isDraggingMinute) {
      event.preventDefault();
      const touch = event.touches[0];
      this.updateTime(touch.clientX, touch.clientY);
    }
  };

  updateTime(clientX: number, clientY: number): void {
    const svg = document.querySelector('.clock') as SVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scale = rect.width / 400;
    const centerX = rect.left + 200 * scale;
    const centerY = rect.top + 200 * scale;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    if (angle < 0) angle += 360;

    if (this.isDraggingHour) {
      const hourValue = angle / 30;
      this.hour = Math.round(hourValue) % 12;
    } else if (this.isDraggingMinute) {
      this.minute = Math.round(angle / 6) % 60;
    }
  }

  onMouseUp = (): void => {
    this.isDraggingHour = false;
    this.isDraggingMinute = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  };

  onTouchEnd = (): void => {
    this.isDraggingHour = false;
    this.isDraggingMinute = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  };

  formatTime(): string {
    const h = this.hour === 0 ? 12 : this.hour;
    const m = this.minute.toString().padStart(2, '0');
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
}

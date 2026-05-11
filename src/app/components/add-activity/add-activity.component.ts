import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  OnInit,
  inject,
} from '@angular/core';
import { Activity } from '@/app/interfaces/activity';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '@/app/services/activity.service';
import { HttpResult } from '@/app/types/httpResult';
import { CommonModule } from '@angular/common';
import dayjs from 'dayjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalAlertComponent } from '../modal-alert/modal-alert.component';
import { ToastService } from '@/app/services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-activity',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslateModule, ModalAlertComponent],
  templateUrl: './add-activity.component.html',
  styleUrl: './add-activity.component.css',
})
export class AddActivityComponent implements OnChanges, OnInit {
  @Output() canceled = new EventEmitter<boolean>();
  @Output() success = new EventEmitter<boolean>();
  @Output() showToast = new EventEmitter<string>();
  @Output() updatedData = new EventEmitter<{ data: Activity; message: string }>();
  public error: { enabled: boolean; message: string } = { enabled: false, message: '' };
  @Input() mode: 'update' | 'insert' = 'insert';
  @Input() activityToUpdate!: Activity;
  @Input() title = 'Add Activity';
  public loading = false;
  public submitted = false;
  public activity: Activity = {
    name: '',
    description: '',
    image: '',
    emoji: '',
    isPeriodic: true,
    dayOfWeek: 'tuesday',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  };

  public showEmojiPicker = false;
  public commonEmojis = [
    // Education & Learning
    '📚',
    '📖',
    '✏️',
    '📝',
    '🎓',
    '🏫',
    '',
    '📕',
    '📗',
    '📘',
    '📙',
    '📓',
    // Technology & Innovation
    '💻',
    '🖥️',
    '⌨️',
    '🖱️',
    '💾',
    '📱',
    '🔌',
    '🤖',
    '🚀',
    '💡',
    '🔬',
    '🧪',
    '🔭',
    '⚙️',
    '🔧',
    '🔨',
    // Arts & Culture
    '🎨',
    '🖼️',
    '🎭',
    '🎪',
    '🎬',
    '🎥',
    '📷',
    '📸',
    '🎵',
    '🎶',
    '🎤',
    '🎧',
    '🎹',
    '🎸',
    '🎺',
    '🎻',
    // Sports & Recreation
    '⚽',
    '🏀',
    '🏈',
    '⚾',
    '🎾',
    '🏐',
    '🏓',
    '🏸',
    '🏒',
    '🏑',
    '🥊',
    '🥋',
    '⛳',
    '🎯',
    '🎳',
    '🏊',
    // Communication & Discussion
    '🗣️',
    '💬',
    '💭',
    '🗨️',
    '📢',
    '📣',
    '🎙️',
    '☎️',
    '📞',
    '✉️',
    '📧',
    '📬',
    '📮',
    '📪',
    // Community & Social
    '👥',
    '👫',
    '👬',
    '👭',
    '🤝',
    '👋',
    '🙌',
    '👏',
    '🤲',
    '🙏',
    '❤️',
    '💙',
    '💚',
    '💛',
    // American & Global Culture
    '🇺🇸',
    '🌎',
    '🌍',
    '🌏',
    '🌐',
    '🗽',
    '🏛️',
    '🎆',
    '🎇',
    '🗼',
    '🏰',
    // Events & Celebrations
    '🎉',
    '🎊',
    '🎈',
    '🎁',
    '🏆',
    '🥇',
    '🥈',
    '🥉',
    '🎖️',
    '🏅',
    '🎀',
    '🎗️',
    // Food & Hospitality
    '☕',
    '🍕',
    '🍔',
    '🌮',
    '🍿',
    '🧁',
    '🍰',
    '🎂',
    '🍪',
    '🥤',
    '🧃',
    '🍩',
    // Nature & Environment
    '🌱',
    '🌳',
    '🌲',
    '🌿',
    '♻️',
    '🌞',
    '🌈',
    '⛰️',
    '🌊',
    '🌸',
    '🌺',
    '🌻',
    // Business & Leadership
    '💼',
    '📊',
    '📈',
    '📉',
    '💰',
    '🎯',
    '🔑',
    '🏢',
    '📋',
    '📌',
    '📍',
    '🗂️',
    // Health & Wellness
    '🧘',
    '🏃',
    '🚴',
    '💪',
    '🧠',
    '�',
    '💊',
    '🏥',
    '⚕️',
    // Reading & Writing
    '📰',
    '📄',
    '📃',
    '📋',
    '📑',
    '🔖',
    '🖊️',
    '🖋️',
    '✒️',
    '📜',
    '📚',
    // Gaming & Entertainment
    '🎮',
    '🎲',
    '🃏',
    '🎰',
    '🧩',
    '🪀',
    '🎪',
    '🎡',
    '🎢',
    // Travel & Adventure
    '✈️',
    '🗺️',
    '🧳',
    '🎒',
    '🏕️',
    '⛺',
    '🚂',
    '🚗',
    '🚢',
    // General Positive
    '😊',
    '😃',
    '😄',
    '🙂',
    '👍',
    '✨',
    '🌟',
    '💫',
    '⭐',
    '🌠',
  ];

  private activityService = inject(ActivityService);
  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  showDeleteModal = false;
  deleteTitle = '';
  deleteMessage = '';

  cancel() {
    this.canceled.emit(true);
    this.activity = {
      name: '',
      description: '',
      image: '',
      emoji: '',
      isPeriodic: true,
      dayOfWeek: 'tuesday',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
    };
    this.showEmojiPicker = false;
  }

  selectEmoji(emoji: string) {
    this.activity.emoji = emoji;
    this.showEmojiPicker = false;
  }

  ngOnInit() {
    if (this.mode == 'update') {
      this.activity = { ...this.activityToUpdate };
    } else {
      // Explicitly reset the form when in insert mode
      this.activity = {
        name: '',
        description: '',
        image: '',
        emoji: '',
        isPeriodic: true,
        dayOfWeek: 'tuesday',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
      };
      this.showEmojiPicker = false;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode']) {
      if (this.mode === 'insert') {
        this.activity = {
          name: '',
          description: '',
          image: '',
          isPeriodic: true,
          dayOfWeek: 'tuesday',
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
        };
      }
    }

    if (changes['activityToUpdate'] && this.mode === 'update') {
      this.activity = { ...this.activityToUpdate };
    }
  }

  formatDate(date: Date | string) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  formatTime(time: string) {
    if (!time) return '';

    // If it's an ISO timestamp (contains 'T'), extract just the time portion
    if (time.includes('T')) {
      try {
        const date = new Date(time);
        // Use UTC to avoid timezone issues
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      } catch (e) {
        console.error('Error formatting time:', time, e);
        return '';
      }
    }

    // If it's already in HH:mm format, add seconds
    if (time.length === 5) {
      return time + ':00';
    }

    // Otherwise return as-is (already in HH:mm:ss format)
    return time;
  }

  checkValidation(): boolean {
    const m = this.activity;
    const commonFields = m.name?.trim() && m.description && m.startTime && m.endTime;

    if (!commonFields) return false;

    if (m.isPeriodic) {
      return !!m.dayOfWeek;
    } else {
      return !!(m.startDate && m.endDate);
    }
  }

  saveActivity() {
    this.submitted = true;
    this.loading = true;
    if (this.mode == 'insert') {
      this.insertActivity();
    } else {
      this.updateActivity();
    }
  }

  insertActivity() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all required fields.',
      };
      this.loading = false;
      return;
    }

    const baseDate = this.activity.startDate ? this.activity.startDate : new Date();
    const formattedStartTime = this.formatTime(this.activity.startTime);
    const formattedEndTime = this.formatTime(this.activity.endTime);

    // Always send startDate and endDate, defaulting to baseDate if not present
    // Only send startDate and endDate if NOT periodic
    const formattedStartDate = !this.activity.isPeriodic
      ? this.formatDate(this.activity.startDate || baseDate)
      : null;
    const formattedEndDate = !this.activity.isPeriodic
      ? this.formatDate(this.activity.endDate || baseDate)
      : null;
    const formattedDayOfWeek = this.activity.isPeriodic ? this.activity.dayOfWeek : null;

    this.activity = {
      ...this.activity,
      dayOfWeek: formattedDayOfWeek,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
    };

    this.activityService.addActivity(this.activity).subscribe(
      (result: HttpResult<Activity>) => {
        if (result.success) {
          this.error = {
            enabled: false,
            message: '',
          };
          this.submitted = false;
          this.showToast.emit(`Activity ${this.activity.name} created successfully`);
          this.activity = {
            name: '',
            description: '',
            image: '',
            emoji: '',
            isPeriodic: true,
            dayOfWeek: 'tuesday',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
          };
          this.showEmojiPicker = false;
          this.success.emit(true);
        }
        this.loading = false;
      },
      error => {
        console.log(error);

        this.error = {
          enabled: true,
          message: error.error.message,
        };
        this.loading = false;
      },
    );
  }

  updateActivity() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all required fields.',
      };
      this.loading = false;
      return;
    }
    const baseDate = this.activity.startDate ? this.activity.startDate : new Date();
    const formattedStartTime = this.formatTime(this.activity.startTime);
    const formattedEndTime = this.formatTime(this.activity.endTime);

    const formattedStartDate = !this.activity.isPeriodic
      ? this.formatDate(this.activity.startDate || baseDate)
      : null;
    const formattedEndDate = !this.activity.isPeriodic
      ? this.formatDate(this.activity.endDate || baseDate)
      : null;
    const formattedDayOfWeek = this.activity.isPeriodic ? this.activity.dayOfWeek : null;

    this.activity = {
      ...this.activity,
      dayOfWeek: formattedDayOfWeek,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
    };

    console.log('this.activity', this.activity);

    this.activityService.updateActivity(this.activity).subscribe(
      (result: HttpResult<Activity>) => {
        console.log('result de update:', result);

        if (result.success) {
          this.error = {
            enabled: false,
            message: '',
          };
          this.submitted = false;
          this.updatedData.emit({
            data: this.activity,
            message: `Activity ${this.activity.name} updated successfully`,
          });
          this.activity = {
            name: '',
            description: '',
            image: '',
            emoji: '',
            isPeriodic: true,
            dayOfWeek: 'tuesday',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
          };
          this.showEmojiPicker = false;
          this.success.emit(true);
        }
        this.loading = false;
      },
      error => {
        this.error = {
          enabled: true,
          message: error.error.message,
        };
        this.loading = false;
      },
    );
  }

  onDeleteClick() {
    this.deleteTitle = this.translateService.instant('alert.deleteTitle');
    this.deleteMessage = this.translateService.instant('alert.deleteMessage', {
      name: this.activity.name,
    });
    // Fallback if translation missing
    if (this.deleteTitle === 'alert.deleteTitle') this.deleteTitle = 'Delete Activity';
    if (this.deleteMessage === 'alert.deleteMessage') {
      this.deleteMessage = `Are you sure you want to delete ${this.activity.name}?`;
    }

    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (this.activity?.id) {
      this.activityService.deleteActivity(this.activity.id).subscribe({
        next: (result: HttpResult<null>) => {
          if (result.success) {
            this.toastService.showToast('Activity deleted successfully');
            this.success.emit(true);
          } else {
            this.toastService.showToast(result.message || 'Failed to delete activity');
          }
          this.showDeleteModal = false;
        },
        error: error => {
          const msg = error.error?.message || error.message || 'Failed to delete activity';
          this.toastService.showToast(msg);
          this.showDeleteModal = false;
        },
      });
    }
  }
}

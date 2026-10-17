import { ZardButtonComponent } from '@/shared/components/button';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  inject,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Occupation } from '@/app/types/occupation';
import { MemberService } from '@/app/services/member.service';
import { Member } from '@/app/interfaces/member';
import { HttpResult } from '@/app/types/httpResult';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Title } from '@/app/types/title';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-add-member',
  standalone: true,
  imports: [ZardButtonComponent, FormsModule, CommonModule, TranslateModule],
  templateUrl: './add-member.component.html',
  styleUrl: './add-member.component.css',
})
export class AddMemberComponent implements OnChanges, OnInit, OnDestroy {
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;
  @Output() canceled = new EventEmitter<boolean>();
  @Output() showToast = new EventEmitter<string>();
  @Output() success = new EventEmitter<boolean>();
  @Output() updatedData = new EventEmitter<{ data: Member; message: string }>();
  public occupations: Occupation[] = ['employee', 'entrepreneur', 'student', 'unemployed'];
  public titles: Title[] = ['Miss', 'Mr', 'Mrs'];
  public error: { enabled: boolean; message: string } = { enabled: false, message: '' };
  @Input() mode: 'update' | 'insert' = 'insert';
  @Input() memberToUpdate!: Member;
  @Input() pageTitle!: string;
  public loading = false;
  public submitted = false;
  public selectedPhoto: File | null = null;
  public photoPreviewUrl = '';
  public removeCurrentPhoto = false;
  public cameraOpen = false;
  public cameraError = '';
  private cameraStream: MediaStream | null = null;
  private objectUrl = '';
  public member: Member = {
    registrationNumber: null,
    firstName: '',
    lastName: '',
    title: 'Mr',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    address: '',
    occupation: 'unemployed',
    phoneNumber: '',
    studyOrWorkPlace: '',
    joinDate: '',
    profileImage: '',
  };

  private memberService = inject(MemberService);
  private translate = inject(TranslateService);

  ngOnInit() {
    if (this.mode == 'update') {
      this.member = { ...this.memberToUpdate };
      this.setTitle(this.member.title);
      this.photoPreviewUrl = this.getPhotoUrl(this.member.profileImage);
    } else {
      this.member = {
        registrationNumber: null,
        firstName: '',
        lastName: '',
        title: 'Mr',
        gender: 'male',
        birthDate: '',
        birthPlace: '',
        address: '',
        occupation: 'unemployed',
        phoneNumber: '',
        studyOrWorkPlace: '',
        joinDate: '',
        profileImage: '',
      };
    }
  }

  cancel() {
    this.stopCamera();
    this.releaseObjectUrl();
    this.canceled.emit(true);
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.releaseObjectUrl();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode']) {
      if (this.mode === 'insert') {
        this.member = {
          registrationNumber: null,
          firstName: '',
          lastName: '',
          title: '',
          gender: '',
          birthDate: '',
          birthPlace: '',
          address: '',
          occupation: 'unemployed',
          phoneNumber: '',
          studyOrWorkPlace: '',
          joinDate: '',
          profileImage: '',
        };
      }
    }

    if (changes['memberToUpdate'] && this.mode === 'update') {
      this.member = { ...this.memberToUpdate };
      this.setTitle(this.member.title);
      this.resetPhotoSelection();
      this.photoPreviewUrl = this.getPhotoUrl(this.member.profileImage);
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.usePhoto(file);
  }

  async openCamera(): Promise<void> {
    this.cameraError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = this.translate.instant('memberPhoto.errors.unavailable');
      return;
    }
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      this.cameraOpen = true;
      setTimeout(() => {
        if (this.cameraVideo?.nativeElement && this.cameraStream) {
          this.cameraVideo.nativeElement.srcObject = this.cameraStream;
        }
      });
    } catch {
      this.cameraError = this.translate.instant('memberPhoto.errors.denied');
      this.stopCamera();
    }
  }

  capturePhoto(): void {
    const video = this.cameraVideo?.nativeElement;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      blob => {
        if (blob)
          this.usePhoto(new File([blob], `member-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        this.stopCamera();
      },
      'image/jpeg',
      0.9,
    );
  }

  stopCamera(): void {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = null;
    if (this.cameraVideo?.nativeElement) this.cameraVideo.nativeElement.srcObject = null;
    this.cameraOpen = false;
  }

  removePhoto(): void {
    this.releaseObjectUrl();
    this.selectedPhoto = null;
    this.photoPreviewUrl = '';
    this.removeCurrentPhoto = true;
    this.cameraError = '';
  }

  get displayPhotoUrl(): string {
    return this.photoPreviewUrl || `${environment.FILE_URL}/user.png`;
  }

  onPhotoError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = `${environment.FILE_URL}/user.png`;
  }

  private usePhoto(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.cameraError = this.translate.instant('memberPhoto.errors.type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.cameraError = this.translate.instant('memberPhoto.errors.size');
      return;
    }
    this.releaseObjectUrl();
    this.selectedPhoto = file;
    this.objectUrl = URL.createObjectURL(file);
    this.photoPreviewUrl = this.objectUrl;
    this.removeCurrentPhoto = false;
    this.cameraError = '';
  }

  private getPhotoUrl(reference?: string): string {
    if (!reference) return '';
    if (/^https?:\/\//i.test(reference)) return reference;
    const cleanReference = reference.replace(/^\/?uploads\//, '').replace(/^\//, '');
    return `${environment.FILE_URL}/${cleanReference}`;
  }

  private resetPhotoSelection(): void {
    this.releaseObjectUrl();
    this.selectedPhoto = null;
    this.removeCurrentPhoto = false;
    this.cameraError = '';
    this.stopCamera();
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = '';
  }

  setTitle(title: string) {
    this.member.title = title;
    this.member.gender =
      title === 'Mr' ? 'male' : title === 'Miss' || title === 'Mrs' ? 'female' : '';
  }

  checkValidation(): boolean {
    const m = this.member;
    if (
      m.firstName?.trim() /* &&
      m.lastName?.trim() &&
      m.birthDate &&
      m.birthPlace?.trim() &&
      m.address?.trim() &&
      m.occupation &&
      m.studyOrWorkPlace?.trim() &&
      m.phoneNumber?.trim() &&
      m.joinDate */
    ) {
      return true;
    }
    return false;
  }

  saveMember() {
    this.submitted = true;
    this.loading = true;
    if (this.mode == 'insert') {
      this.insertMember();
    } else {
      this.updateMember();
    }
  }

  insertMember() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all fields.',
      };
      this.loading = false;
      return;
    }
    this.memberService.addMember(this.member, this.selectedPhoto).subscribe(
      (result: HttpResult<Member>) => {
        if (result.success) {
          this.error = {
            enabled: false,
            message: '',
          };
          this.submitted = false;
          this.showToast.emit(
            `Member ${this.member.firstName} ${this.member.lastName} created successfully`,
          );
          this.member = {
            registrationNumber: null,
            firstName: '',
            lastName: '',
            title: '',
            gender: '',
            birthDate: '',
            birthPlace: '',
            address: '',
            occupation: 'unemployed',
            phoneNumber: '',
            studyOrWorkPlace: '',
            joinDate: '',
            profileImage: '',
          };
          this.resetPhotoSelection();
          this.photoPreviewUrl = '';
          this.success.emit(true);
        }
        this.loading = false;
      },
      error => {
        this.error = {
          enabled: true,
          message: error.error?.message || 'An error occurred',
        };
        this.loading = false;
      },
    );
  }

  updateMember() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all required fields.',
      };
      this.loading = false;
      return;
    }
    this.memberService
      .updateMember(this.member, this.selectedPhoto, this.removeCurrentPhoto)
      .subscribe(
        (result: HttpResult<Member>) => {
          if (result.success) {
            this.error = {
              enabled: false,
              message: '',
            };
            this.submitted = false;
            this.updatedData.emit({
              data: result.data,
              message: `Member ${this.member.firstName} ${this.member.lastName} updated successfully`,
            });
          }
          this.loading = false;
        },
        error => {
          this.error = {
            enabled: true,
            message: error.error?.message || 'An error occurred',
          };
          this.loading = false;
        },
      );
  }
}

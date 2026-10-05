import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@/app/services/auth.service';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputComponent } from '@/shared/components/input';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputComponent,
  ],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css',
})
export class MyProfileComponent implements OnInit {
  auth = inject(AuthService);
  username = '';
  email = '';
  identityPassword = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingIdentity = false;
  savingPassword = false;
  identityMessage = '';
  passwordMessage = '';
  identityError = '';
  passwordError = '';

  ngOnInit(): void {
    this.username = this.auth.user?.username ?? '';
    this.email = this.auth.user?.email ?? '';
  }

  saveIdentity(form: NgForm): void {
    this.identityMessage = '';
    this.identityError = '';
    this.savingIdentity = true;
    this.auth
      .updateProfile({
        username: this.username.trim(),
        email: this.email.trim(),
        currentPassword: this.identityPassword,
      })
      .subscribe({
        next: () => {
          this.identityPassword = '';
          form.resetForm({ username: this.username, email: this.email, identityPassword: '' });
          this.savingIdentity = false;
          this.identityMessage = 'profile.detailsSaved';
        },
        error: error => {
          this.savingIdentity = false;
          this.identityError = this.errorKey(error);
        },
      });
  }

  savePassword(form: NgForm): void {
    this.passwordMessage = '';
    this.passwordError = '';
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'profile.passwordMismatch';
      return;
    }
    this.savingPassword = true;
    this.auth
      .updateProfile({ currentPassword: this.currentPassword, newPassword: this.newPassword })
      .subscribe({
        next: () => {
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          form.resetForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.savingPassword = false;
          this.passwordMessage = 'profile.passwordSaved';
        },
        error: error => {
          this.savingPassword = false;
          this.passwordError = this.errorKey(error);
        },
      });
  }

  private errorKey(error: { status?: number; error?: { message?: string } }): string {
    if (error.status === 409) return 'profile.alreadyUsed';
    if (error.error?.message === 'Incorrect current password') return 'profile.wrongPassword';
    if (error.status === 422) return 'profile.invalidDetails';
    return 'profile.saveError';
  }
}

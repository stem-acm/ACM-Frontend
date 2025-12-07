import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@/app/services/auth.service';
import { Router } from '@angular/router';
import { TitleComponent } from '@/app/components/title/title.component';
import { AppComponent } from '@/app/app.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, TitleComponent, TranslateModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private app = inject(AppComponent);

  public username!: string;
  public password!: string;
  public loading = false;
  public error: { enabled: boolean; message: string } = { enabled: false, message: '' };

  private translateService = inject(TranslateService);

  validate() {
    if (this.username && this.password) {
      this.error = { enabled: false, message: '' };
      this.loading = true;
      this.onLogin();
    } else {
      this.translateService.get('errors.fillAll').subscribe(translation => {
        this.error = {
          enabled: true,
          message: translation,
        };
      });
    }
  }

  onLogin() {
    this.authService.login({ username: this.username, password: this.password }).subscribe(
      res => {
        this.authService.saveToken(res.data.token);
        this.loading = false;
        this.app.userConnected = true;
        this.app.user = res.data.user;
        this.router.navigate(['/']);
      },
      err => {
        this.error = {
          enabled: true,
          message: err.error.message,
        };
        this.loading = false;
      },
    );
  }
}

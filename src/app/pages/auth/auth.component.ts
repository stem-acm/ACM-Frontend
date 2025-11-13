import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpResult } from '../../types/httpResult';
import { Router } from '@angular/router';
import { TitleComponent } from '../../components/title/title.component';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, TitleComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  public username!: string;
  public password!: string;
  public loading: boolean = false;
  public error: {enabled: boolean, message: string} = {enabled: false, message: ''};

  constructor(private authService: AuthService, private router: Router, private app: AppComponent) {}

  validate() {
    if(this.username && this.password) {
      this.error = {enabled: false, message: ''};
      this.loading = true;
      this.onLogin();
    } else {
      this.error = {
        enabled: true,
        message: 'Please, fill all'
      };
    }
  }

  onLogin() {
    this.authService.login({ username: this.username, password: this.password })
      .subscribe(
        (res) => {
          this.authService.saveToken(res.data.token);
          this.loading = false;
          this.app.userConnected = true;
          this.router.navigate(['/']);
        },
        (err) => {
          this.error = {
            enabled: true,
            message: err.error.message
          }
          this.loading = false;
        }
      );
  }

}

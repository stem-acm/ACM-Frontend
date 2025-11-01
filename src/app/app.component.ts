import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { User } from './interfaces/user';
import { AuthService } from './services/auth.service';
import { HttpResult } from './types/httpResult';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'ACM-Frontend';
  public user!: User;
  public userConnected: boolean = false;
  public toast: {show: boolean, message: string} = {show: false, message: ''};

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.verifyToken();
  }

  verifyToken() {
    this.authService.verifyToken()
      .subscribe(
        (result: HttpResult) => {
          if(result.success) {
            this.user = result.data;
            this.userConnected = true;
            if (this.router.url.startsWith('/auth')) {
              this.router.navigate(['/']); // rediriger vers home
            }
          } else {
            this.router.navigate(['/auth']);
          }
        },
        (error: any) => {
          this.router.navigate(['/auth']);
        }
      )
  }

  showToast(message: string = '', delay: number = 3000) {
    this.toast = {show: true, message: message};
    setInterval(() => {
      this.toast.show = false;
    }, delay);
  }

  closeToast(event: any) {
    if(event) this.toast.show = false;
  }

}

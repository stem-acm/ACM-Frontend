import { Component } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { User } from './interfaces/user';
import { AuthService } from './services/auth.service';
import { HttpResult } from './types/httpResult';
import { ToastComponent } from './components/toast/toast.component';
import { filter } from 'rxjs/operators';
import { AcmLogoComponent } from "./components/acm-logo/acm-logo.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent, AcmLogoComponent, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'ACM-Frontend';
  public user!: User;
  public userConnected: boolean = false;
  public toast: {show: boolean, message: string} = {show: false, message: ''};
  public hideMainLayout: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.verifyToken();
    this.checkRoute()
  }

  checkRoute() {
    this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        if (event.url === '/checkin') {
          this.hideMainLayout = true;
        } else {
          this.hideMainLayout = false;
        }
      });
  }

  verifyToken() {
    this.authService.verifyToken()
      .subscribe(
        (result: HttpResult<User>) => {
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
        (error) => {
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

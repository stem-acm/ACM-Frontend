import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from '@/app/components/navbar/navbar.component';
import { User } from '@/app/interfaces/user';
import { AuthService } from '@/app/services/auth.service';
import { HttpResult } from '@/app/types/httpResult';
import { ToastComponent } from '@/app/components/toast/toast.component';
import { filter } from 'rxjs/operators';
import { AcmLogoComponent } from '@/app/components/acm-logo/acm-logo.component';
import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent, AcmLogoComponent, NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'ACM-Frontend';
  public user!: User;
  public userConnected = false;
  public toast: { show: boolean; message: string } = { show: false, message: '' };
  public hideMainLayout = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.verifyToken();
    this.checkRoute();
  }

  checkRoute() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.hideMainLayout = event.url === '/checkin';
      });
  }

  verifyToken() {
    this.authService.verifyToken().subscribe(
      (result: HttpResult<User>) => {
        if (result.success) {
          this.user = result.data;
          this.userConnected = true;
          if (this.router.url.startsWith('/auth')) {
            this.router.navigate(['/']); // rediriger vers home
          }
        } else {
          this.router.navigate(['/auth']);
        }
      },
      _ => {
        this.router.navigate(['/auth']);
      },
    );
  }

  showToast(message = '', delay = 3000) {
    this.toast = { show: true, message: message };
    setInterval(() => {
      this.toast.show = false;
    }, delay);
  }

  closeToast(event: boolean) {
    if (event) this.toast.show = false;
  }
}

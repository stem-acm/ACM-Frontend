import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from '@/app/components/navbar/navbar.component';
import { AuthService } from '@/app/services/auth.service';
import { ToastComponent } from '@/app/components/toast/toast.component';
import { filter } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { AcmLogoComponent } from '@/app/components/acm-logo/acm-logo.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@/app/services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterOutlet,
    NavbarComponent,
    ToastComponent,
    AcmLogoComponent,
    NgxSpinnerModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'ACM-Frontend';
  public toast: { show: boolean; message: string } = { show: false, message: '' };
  public hideMainLayout = false;
  public isAuthRoute = true;

  private authService = inject(AuthService);
  readonly user$ = this.authService.user$;
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private languageService = inject(LanguageService);

  ngOnInit() {
    // Initialize translations
    this.initializeTranslations();
    this.checkRoute();
  }

  private initializeTranslations() {
    const currentLang = this.languageService.getCurrentLanguage();
    this.translateService.setDefaultLang('en');
    this.translateService.use(currentLang);
  }

  checkRoute() {
    this.updateLayout(this.router.url);
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        this.updateLayout(event.urlAfterRedirects);
      });
  }

  private updateLayout(url: string) {
    const path = url.split(/[?#]/)[0];
    this.isAuthRoute = path === '/auth';
    this.hideMainLayout = path === '/checkin';
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

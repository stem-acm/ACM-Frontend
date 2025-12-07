import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { AcmLogoComponent } from '@/app/components/acm-logo/acm-logo.component';
import { FlexMenusComponent } from '@/app/components/flex-menus/flex-menus.component';
import { AuthService } from '@/app/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '@/app/interfaces/user';
import { environment } from '@/environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@/app/services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AcmLogoComponent, FlexMenusComponent, CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private URL: string = environment.FILE_URL;
  @Input() user!: User;
  public isShowUserMenu = false;
  public showExperimentalFeatures = environment.SHOW_EXPERIMENTAL_FEATURES;
  public currentLanguage = 'en';
  public languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'mg', name: 'Malagasy' },
  ];

  private auth = inject(AuthService);
  private translateService = inject(TranslateService);
  private languageService = inject(LanguageService);
  private langChangeSubscription?: Subscription;

  ngOnInit() {
    // Get current language from TranslateService
    this.currentLanguage =
      this.translateService.currentLang || this.translateService.getDefaultLang() || 'en';

    // Subscribe to language changes to keep it in sync
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(event => {
      this.currentLanguage = event.lang;
    });
  }

  ngOnDestroy() {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  logout() {
    this.auth.logout();
    window.location.reload();
  }

  toggleUserMenu() {
    this.isShowUserMenu = !this.isShowUserMenu;
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${(fileName ??= 'user.png')}`;
  }

  changeLanguage(lang: string) {
    this.currentLanguage = lang;
    this.languageService.setLanguage(lang);
    this.translateService.use(lang);
  }

  getLanguageName(code: string): string {
    const lang = this.languages.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  }
}

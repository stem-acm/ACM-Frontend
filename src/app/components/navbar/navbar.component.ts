import { Component, inject, Input } from '@angular/core';
import { AcmLogoComponent } from '@/app/components/acm-logo/acm-logo.component';
import { FlexMenusComponent } from '@/app/components/flex-menus/flex-menus.component';
import { AuthService } from '@/app/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '@/app/interfaces/user';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AcmLogoComponent, FlexMenusComponent, CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  private URL: string = environment.FILE_URL;
  @Input() user!: User;
  public isShowUserMenu = false;
  public userMenu: { route: string; label: string }[] = [
    {
      route: '/setting',
      label: 'Settings',
    },
    {
      route: '/user',
      label: 'Manage intern',
    },
  ];

  private auth = inject(AuthService);

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
}

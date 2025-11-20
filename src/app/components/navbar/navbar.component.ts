import { Component, inject, Input } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import { FlexMenusComponent } from '../flex-menus/flex-menus.component';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '@/app/interfaces/user';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AcmLogoComponent, FlexMenusComponent, CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
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
}

import { Component, Input } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import { FlexMenusComponent } from '../flex-menus/flex-menus.component';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { isSubscription } from 'rxjs/internal/Subscription';
import { CommonModule } from '@angular/common';
import { User } from '../../interfaces/user';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AcmLogoComponent, FlexMenusComponent, CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  @Input() user!: User;
  public isShowUserMenu: boolean = false;
  public userMenu: {route: string, label: string}[] = [
    {
      route: '/setting',
      label: 'Settings'
    },
    {
      route: '/user',
      label: 'Manage intern'
    }
  ]

  constructor(private auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout();
    window.location.reload();
  }

  toggleUserMenu() {
    this.isShowUserMenu = !this.isShowUserMenu;
  }

}

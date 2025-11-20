import { Component } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import { FlexMenusComponent } from '../flex-menus/flex-menus.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { isSubscription } from 'rxjs/internal/Subscription';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AcmLogoComponent, FlexMenusComponent, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
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
    this.router.navigate(['/auth']);
  }

  toggleUserMenu() {
    this.isShowUserMenu = !this.isShowUserMenu;
    console.log(this.isShowUserMenu);
    
  }

}

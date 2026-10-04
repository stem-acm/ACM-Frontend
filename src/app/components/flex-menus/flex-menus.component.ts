import { Component, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ZardButtonComponent } from '@/shared/components/button';
import { AuthService } from '@/app/services/auth.service';

@Component({
  selector: 'app-flex-menus',
  standalone: true,
  imports: [RouterModule, TranslateModule, ZardButtonComponent],
  templateUrl: './flex-menus.component.html',
  styleUrl: './flex-menus.component.css',
})
export class FlexMenusComponent {
  auth = inject(AuthService);
  @Input() mobileOpen = false;
  public menus: { route: string; labelKey: string; exact: boolean; permission: string }[] = [
    {
      route: '/',
      labelKey: 'nav.home',
      exact: true,
      permission: 'dashboard.view',
    },
    {
      route: '/members',
      labelKey: 'nav.members',
      exact: false,
      permission: 'members.view',
    },
    {
      route: '/volunteer',
      labelKey: 'nav.volunteer',
      exact: false,
      permission: 'volunteers.view',
    },
    {
      route: '/activity',
      labelKey: 'nav.activity',
      exact: false,
      permission: 'activities.view',
    },
    {
      route: '/checkin-history',
      labelKey: 'nav.checkin-history',
      exact: false,
      permission: 'checkins.view',
    },
    {
      route: '/checkin',
      labelKey: 'nav.checkin',
      exact: false,
      permission: 'checkins.create',
    },
  ];
}

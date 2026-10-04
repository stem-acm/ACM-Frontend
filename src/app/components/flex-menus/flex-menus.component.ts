import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ZardButtonComponent } from '@/shared/components/button';

@Component({
  selector: 'app-flex-menus',
  standalone: true,
  imports: [RouterModule, TranslateModule, ZardButtonComponent],
  templateUrl: './flex-menus.component.html',
  styleUrl: './flex-menus.component.css',
})
export class FlexMenusComponent {
  @Input() mobileOpen = false;
  public menus: { route: string; labelKey: string; exact: boolean }[] = [
    {
      route: '/',
      labelKey: 'nav.home',
      exact: true,
    },
    {
      route: '/members',
      labelKey: 'nav.members',
      exact: false,
    },
    /*{
      route: '/cards',
      labelKey: 'nav.cards',
      exact: false,
    }, */
    {
      route: '/volunteer',
      labelKey: 'nav.volunteer',
      exact: false,
    },
    {
      route: '/activity',
      labelKey: 'nav.activity',
      exact: false,
    },
    {
      route: '/checkin-history',
      labelKey: 'nav.checkin-history',
      exact: false,
    },
    {
      route: '/checkin',
      labelKey: 'nav.checkin',
      exact: false,
    },
  ];
}

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-flex-menus',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './flex-menus.component.html',
  styleUrl: './flex-menus.component.css',
})
export class FlexMenusComponent {
  public menus: { route: string; label: string; exact: boolean }[] = [
    {
      route: '/',
      label: 'Home',
      exact: true,
    },
    {
      route: '/members',
      label: 'Members',
      exact: false,
    },
    {
      route: '/cards',
      label: 'Cards',
      exact: false,
    },
    {
      route: '/volunteer',
      label: 'Volunteer',
      exact: false,
    },
    {
      route: '/activity',
      label: 'Activity',
      exact: false,
    },
    {
      route: '/checkin',
      label: 'Checkin',
      exact: false,
    },
  ];
}

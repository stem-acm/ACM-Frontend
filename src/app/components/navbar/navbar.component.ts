import { Component } from '@angular/core';
import { AcmLogoComponent } from '../acm-logo/acm-logo.component';
import { FlexMenusComponent } from '../flex-menus/flex-menus.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AcmLogoComponent, FlexMenusComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

}

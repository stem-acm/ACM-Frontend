import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('acm-language'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selects the saved language in the language select on load', () => {
    localStorage.setItem('acm-language', 'fr');
    const saved = TestBed.createComponent(NavbarComponent);
    saved.detectChanges();

    const select = saved.nativeElement.querySelector('#language-select') as HTMLSelectElement;
    expect(select.value).toBe('fr');
  });
});

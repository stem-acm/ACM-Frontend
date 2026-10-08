import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { User } from './interfaces/user';

const testUser: User = {
  id: 1,
  username: 'tester',
  email: 'test@example.com',
  role: 'admin',
  active: true,
  createdAt: '',
  updatedAt: '',
  permissions: { 'dashboard.view': true },
};

describe('AppComponent navigation visibility', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('hides navigation on the login route even if a user is present', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/auth?returnUrl=/');
    TestBed.inject(AuthService).setUser(testUser);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-navbar')).toBeNull();
  });

  it('removes navigation immediately when the session is cleared', () => {
    TestBed.inject(AuthService).setUser(testUser);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-navbar')).not.toBeNull();
    TestBed.inject(AuthService).logout();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-navbar')).toBeNull();
  });
});

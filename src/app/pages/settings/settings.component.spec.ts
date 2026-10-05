import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@/app/services/auth.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  it('keeps changes across role tabs and warns before leaving until they are saved', async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [{ provide: AuthService, useValue: { user: { id: 1, role: 'admin' } } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne(request => request.url.endsWith('/settings/roles'))
      .flush({
        success: true,
        data: [
          { role: 'intern', active: true, permissions: { 'members.view': false } },
          { role: 'volunteer', active: true, permissions: { 'members.view': false } },
        ],
      });
    http
      .expectOne(request => request.url.endsWith('/settings/users'))
      .flush({
        success: true,
        data: [],
      });
    fixture.detectChanges();

    component.policies[0].permissions['members.view'] = true;
    component.selectedRole = 'volunteer';
    expect(component.isRoleDirty('intern')).toBeTrue();
    expect(component.policies[0].permissions['members.view']).toBeTrue();

    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    expect(confirm).toHaveBeenCalled();

    component.selectedRole = 'intern';
    component.savePolicy();
    http
      .expectOne(request => request.url.endsWith('/settings/roles/intern'))
      .flush({
        success: true,
        data: { role: 'intern', active: true, permissions: { 'members.view': true } },
      });

    expect(component.isRoleDirty('intern')).toBeFalse();
    expect(component.canLeave()).toBeTrue();
    http.verify();
  });
});

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

  it('shows the audit log in its own tab and keeps the unsaved role changes', async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [{ provide: AuthService, useValue: { user: { id: 1, role: 'admin' } } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne(request => request.url.endsWith('/settings/roles'))
      .flush({
        success: true,
        data: [{ role: 'intern', active: true, permissions: { 'members.view': false } }],
      });
    http
      .expectOne(request => request.url.endsWith('/settings/users'))
      .flush({
        success: true,
        data: [
          { id: 7, username: 'fanja', email: 'fanja@test.local', role: 'intern', active: true },
        ],
      });
    fixture.detectChanges();

    // The first tab is the roles and the accounts: no audit log, no request for it.
    expect(component.pageTab).toBe('access');
    expect(element.querySelector('app-audit-log')).toBeNull();
    http.expectNone(request => request.url.endsWith('/settings/logs'));
    component.policies[0].permissions['members.view'] = true;

    const tabs = element.querySelectorAll<HTMLButtonElement>('.access-page-tabs button');
    expect(tabs.length).toBe(2);
    tabs[1].click();
    fixture.detectChanges();

    expect(component.pageTab).toBe('logs');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(element.querySelector('app-audit-log')).not.toBeNull();
    const logs = http.expectOne(request => request.url.endsWith('/settings/logs'));
    expect(logs.request.params.get('limit')).toBe('25');
    logs.flush({ success: true, data: [] });
    fixture.detectChanges();

    // The audit log gets the accounts of the page for its "Done by" filter.
    const actors = element.querySelectorAll('select[name="audit-actor"] option');
    expect(actors.length).toBe(2);
    expect(actors[1].textContent).toContain('fanja');

    tabs[0].click();
    fixture.detectChanges();

    expect(element.querySelector('app-audit-log')).toBeNull();
    expect(component.isRoleDirty('intern')).toBeTrue();
    http.verify();
  });
});

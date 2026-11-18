import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@/app/services/auth.service';
import { defaultCheckinSchedule } from '@/testing/checkin-schedule';
import { AppSettingsService } from '@/app/services/app-settings.service';
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
    expect(tabs.length).toBe(4);
    tabs[3].click();
    fixture.detectChanges();

    expect(component.pageTab).toBe('logs');
    expect(tabs[3].getAttribute('aria-selected')).toBe('true');
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
    // The general and check-in tabs were never opened: nothing was requested for them.
    http.expectNone(request => request.url.endsWith('/settings/checkin-schedule'));
    http.expectNone(request => request.url.endsWith('/settings/timezone'));
    http.verify();
  });

  it('loads the check-in tab on its first opening and keeps its edits across tabs', async () => {
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
        data: [],
      });
    fixture.detectChanges();

    const tabs = element.querySelectorAll<HTMLButtonElement>('.access-page-tabs button');
    expect(Array.from(tabs).map(tab => tab.textContent?.trim())).toEqual([
      'auditLog.tabs.access',
      'auditLog.tabs.general',
      'auditLog.tabs.checkin',
      'auditLog.tabs.logs',
    ]);
    expect(element.querySelector('app-checkin-schedule')).toBeNull();
    http.expectNone(request => request.url.endsWith('/settings/checkin-schedule'));

    tabs[2].click();
    fixture.detectChanges();
    expect(component.pageTab).toBe('checkin');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('.access-groups')).toBeNull();
    http
      .expectOne(request => request.url.endsWith('/settings/checkin-schedule'))
      .flush({
        success: true,
        data: defaultCheckinSchedule(),
      });
    http
      .expectOne(request => request.url.endsWith('/settings/timezone'))
      .flush({ success: true, data: { timezone: 'Indian/Antananarivo' } });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const sunday = element.querySelector<HTMLInputElement>(
      '.checkin-day[data-day="sunday"] input[type="checkbox"]',
    )!;
    sunday.click();
    fixture.detectChanges();
    expect(component.checkinDirty).toBeTrue();
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(tabs[2].querySelector('.access-unsaved-dot')).not.toBeNull();

    // Away and back: the tab stays mounted (hidden) and is not requested again.
    tabs[0].click();
    fixture.detectChanges();
    const schedule = element.querySelector<HTMLElement>('app-checkin-schedule')!;
    expect(schedule.hidden).toBeTrue();
    expect(element.querySelector('.access-groups')).not.toBeNull();
    tabs[2].click();
    fixture.detectChanges();
    expect(schedule.hidden).toBeFalse();
    http.expectNone(request => request.url.endsWith('/settings/checkin-schedule'));
    expect(
      element.querySelector<HTMLInputElement>(
        '.checkin-day[data-day="sunday"] input[type="checkbox"]',
      )!.checked,
    ).toBeFalse();

    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    expect(confirm).toHaveBeenCalled();
    http.verify();
  });

  it('loads the general tab on its first opening, keeps its edits and shares the saved time zone', async () => {
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
      .flush({ success: true, data: [] });
    http
      .expectOne(request => request.url.endsWith('/settings/users'))
      .flush({ success: true, data: [] });
    fixture.detectChanges();

    const tabs = element.querySelectorAll<HTMLButtonElement>('.access-page-tabs button');
    expect(component.pageTab).toBe('access');
    expect(element.querySelector('app-general-settings')).toBeNull();
    http.expectNone(request => request.url.endsWith('/settings/timezone'));

    tabs[1].click();
    fixture.detectChanges();
    expect(component.pageTab).toBe('general');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    http
      .expectOne(request => request.url.endsWith('/settings/timezone'))
      .flush({ success: true, data: { timezone: 'Indian/Antananarivo' } });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select = () =>
      element.querySelector<HTMLSelectElement>('app-general-settings select[name="timezone"]')!;
    expect(select().value).toBe('Indian/Antananarivo');
    select().value = 'UTC';
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.generalDirty).toBeTrue();
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(tabs[1].querySelector('.access-unsaved-dot')).not.toBeNull();

    // Away and back: the tab stays mounted (hidden) and is not requested again.
    tabs[0].click();
    fixture.detectChanges();
    const general = element.querySelector<HTMLElement>('app-general-settings')!;
    expect(general.hidden).toBeTrue();
    tabs[1].click();
    fixture.detectChanges();
    expect(general.hidden).toBeFalse();
    http.expectNone(request => request.url.endsWith('/settings/timezone'));
    expect(select().value).toBe('UTC');

    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    expect(confirm).toHaveBeenCalled();

    // Save, then open the check-in tab: it shows the saved time zone.
    element
      .querySelectorAll<HTMLButtonElement>(
        'app-general-settings .general-settings-actions button',
      )[1]
      .click();
    const save = http.expectOne(request => request.url.endsWith('/settings/timezone'));
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ timezone: 'UTC' });
    save.flush({ success: true, data: { timezone: 'UTC' } });
    fixture.detectChanges();
    expect(component.generalDirty).toBeFalse();
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(TestBed.inject(AppSettingsService).timezone()).toBe('UTC');
    http.verify();
  });
});

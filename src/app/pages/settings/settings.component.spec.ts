import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@/app/services/auth.service';
import { defaultCheckinSchedule } from '@/testing/checkin-schedule';
import { AppSettingsService } from '@/app/services/app-settings.service';
import { SettingsComponent } from './settings.component';

/** Answers the requests of the General tab: the check-in hours and the time zone. */
function flushGeneral(http: HttpTestingController, timezone = 'Indian/Antananarivo'): void {
  http
    .expectOne(request => request.url.endsWith('/settings/checkin-schedule'))
    .flush({ success: true, data: defaultCheckinSchedule() });
  // Both cards read the time zone: the check-in card for its hint, the time zone card to edit it.
  const reads = http.match(request => request.url.endsWith('/settings/timezone'));
  expect(reads.length).toBe(2);
  reads.forEach(read => read.flush({ success: true, data: { timezone } }));
}

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
    flushGeneral(http);
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

  it('opens on General, then shows the audit log in its own tab and keeps the unsaved role changes', async () => {
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
    flushGeneral(http);
    fixture.detectChanges();

    // The tabs: General first, then the roles and accounts, then the audit log.
    const tabs = element.querySelectorAll<HTMLButtonElement>('.access-page-tabs button');
    expect(Array.from(tabs).map(tab => tab.textContent?.trim())).toEqual([
      'auditLog.tabs.general',
      'auditLog.tabs.access',
      'auditLog.tabs.logs',
    ]);
    expect(component.pageTab).toBe('general');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('.access-groups')).toBeNull();
    // No audit log, no request for it.
    expect(element.querySelector('app-audit-log')).toBeNull();
    http.expectNone(request => request.url.endsWith('/settings/logs'));

    tabs[1].click();
    fixture.detectChanges();
    expect(component.pageTab).toBe('access');
    expect(element.querySelector('.access-groups')).not.toBeNull();
    component.policies[0].permissions['members.view'] = true;

    tabs[2].click();
    fixture.detectChanges();

    expect(component.pageTab).toBe('logs');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(element.querySelector('app-audit-log')).not.toBeNull();
    const logs = http.expectOne(request => request.url.endsWith('/settings/logs'));
    expect(logs.request.params.get('limit')).toBe('25');
    logs.flush({ success: true, data: [] });
    fixture.detectChanges();

    // The audit log gets the accounts of the page for its "Done by" filter.
    const actors = element.querySelectorAll('select[name="audit-actor"] option');
    expect(actors.length).toBe(2);
    expect(actors[1].textContent).toContain('fanja');

    tabs[1].click();
    fixture.detectChanges();

    expect(element.querySelector('app-audit-log')).toBeNull();
    expect(component.isRoleDirty('intern')).toBeTrue();
    http.verify();
  });

  it('shows the check-in hours above the time zone in General and keeps their edits across tabs', async () => {
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
    flushGeneral(http);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const general = element.querySelector<HTMLElement>('.settings-general')!;
    expect(Array.from(general.children).map(child => child.tagName.toLowerCase())).toEqual([
      'app-checkin-schedule',
      'app-general-settings',
    ]);

    const tabs = element.querySelectorAll<HTMLButtonElement>('.access-page-tabs button');
    const sunday = element.querySelector<HTMLInputElement>(
      '.checkin-day[data-day="sunday"] input[type="checkbox"]',
    )!;
    sunday.click();
    fixture.detectChanges();
    expect(component.checkinDirty).toBeTrue();
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(tabs[0].querySelector('.access-unsaved-dot')).not.toBeNull();

    // Away and back: the cards stay mounted (hidden) and are not requested again.
    tabs[1].click();
    fixture.detectChanges();
    expect(general.hidden).toBeTrue();
    expect(element.querySelector('.access-groups')).not.toBeNull();
    tabs[0].click();
    fixture.detectChanges();
    expect(general.hidden).toBeFalse();
    http.expectNone(request => request.url.endsWith('/settings/checkin-schedule'));
    http.expectNone(request => request.url.endsWith('/settings/timezone'));
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

  it('keeps the time zone edits across tabs and shares the saved time zone with the check-in hours', async () => {
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
    flushGeneral(http);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const tabs = element.querySelectorAll<HTMLButtonElement>('.access-page-tabs button');
    const input = () =>
      element.querySelector<HTMLInputElement>('app-general-settings input[name="timezone"]')!;
    expect(input().value).toBe('Indian/Antananarivo');
    input().value = 'UTC';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.generalDirty).toBeTrue();
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(tabs[0].querySelector('.access-unsaved-dot')).not.toBeNull();

    // Away and back: the card stays mounted (hidden) and is not requested again.
    tabs[1].click();
    fixture.detectChanges();
    const general = element.querySelector<HTMLElement>('.settings-general')!;
    expect(general.hidden).toBeTrue();
    tabs[0].click();
    fixture.detectChanges();
    expect(general.hidden).toBeFalse();
    http.expectNone(request => request.url.endsWith('/settings/timezone'));
    expect(input().value).toBe('UTC');

    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    expect(confirm).toHaveBeenCalled();

    // Save: the check-in hours card above shows the saved time zone.
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

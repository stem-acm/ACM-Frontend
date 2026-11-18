import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '@/environments/environment';
import { AppSettingsService } from '@/app/services/app-settings.service';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { GeneralSettingsComponent } from './general-settings.component';

const URL = `${environment.API_URL}/settings/timezone`;

describe('GeneralSettingsComponent', () => {
  let fixture: ComponentFixture<GeneralSettingsComponent>;
  let component: GeneralSettingsComponent;
  let element: HTMLElement;
  let http: HttpTestingController;
  let dirtyEvents: boolean[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralSettingsComponent],
      providers: unitTestProviders,
    }).compileComponents();
    fixture = TestBed.createComponent(GeneralSettingsComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    dirtyEvents = [];
    component.dirtyChange.subscribe(dirty => dirtyEvents.push(dirty));
  });

  afterEach(() => http.verify());

  async function load(timezone = 'Indian/Antananarivo') {
    fixture.detectChanges();
    expect(element.textContent).toContain('ux.loading');
    http.expectOne(URL).flush({ success: true, message: 'Time zone', data: { timezone } });
    fixture.detectChanges();
    // ngModel writes the value of the select asynchronously.
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const select = () => element.querySelector<HTMLSelectElement>('select[name="timezone"]')!;
  const buttons = () =>
    element.querySelectorAll<HTMLButtonElement>('.general-settings-actions button');

  function choose(value: string) {
    select().value = value;
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('selects the stored time zone in a list of names with their UTC offset', async () => {
    await load();
    expect(element.querySelector('h2')?.textContent).toContain('generalSettings.title');
    expect(select().value).toBe('Indian/Antananarivo');
    const labels = Array.from(select().options).map(option => option.textContent?.trim());
    expect(labels).toContain('Indian/Antananarivo (UTC+03:00)');
    expect(labels).toContain('UTC (UTC+00:00)');
    expect(select().options.length).toBeGreaterThan(300);
    expect(component.dirty).toBeFalse();
    expect(buttons()[0].disabled).toBeTrue();
    expect(buttons()[1].disabled).toBeTrue();
  });

  it('lists a stored time zone that the browser list does not have', async () => {
    await load('Etc/GMT-3');
    expect(select().value).toBe('Etc/GMT-3');
  });

  it('shows the unsaved note and emits dirtyChange, then discards the change', async () => {
    await load();
    choose('UTC');
    expect(component.dirty).toBeTrue();
    expect(dirtyEvents).toEqual([true]);
    expect(element.querySelector('.access-unsaved-note')).not.toBeNull();
    expect(buttons()[1].disabled).toBeFalse();

    buttons()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.timezone).toBe('Indian/Antananarivo');
    expect(select().value).toBe('Indian/Antananarivo');
    expect(component.dirty).toBeFalse();
    expect(dirtyEvents).toEqual([true, false]);
    expect(element.querySelector('.access-unsaved-note')).toBeNull();
  });

  it('saves the time zone in one PUT and shares the stored value', async () => {
    await load();
    choose('Europe/Paris');
    buttons()[1].click();
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ timezone: 'Europe/Paris' });
    request.flush({
      success: true,
      message: 'Time zone updated',
      data: { timezone: 'Europe/Paris' },
    });
    fixture.detectChanges();
    expect(component.dirty).toBeFalse();
    expect(TestBed.inject(AppSettingsService).timezone()).toBe('Europe/Paris');
    expect(element.querySelector('.access-notice')?.textContent).toContain('generalSettings.saved');
    expect(dirtyEvents).toEqual([true, false]);
  });

  it('shows the API error and keeps the change', async () => {
    await load();
    choose('UTC');
    buttons()[1].click();
    http
      .expectOne(URL)
      .flush(
        { success: false, message: 'Unknown time zone.', data: null },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();
    expect(element.querySelector('.access-error')?.textContent).toContain('Unknown time zone.');
    expect(component.dirty).toBeTrue();
    expect(component.saving).toBeFalse();
    expect(TestBed.inject(AppSettingsService).timezone()).toBe('Indian/Antananarivo');
  });

  it('offers a retry when the time zone cannot be loaded', () => {
    fixture.detectChanges();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.textContent).toContain('ux.loadError');
    element.querySelector<HTMLButtonElement>('.acm-list-state button')!.click();
    http.expectOne(URL).flush({ success: true, message: '', data: { timezone: 'UTC' } });
    fixture.detectChanges();
    expect(select()).not.toBeNull();
  });
});

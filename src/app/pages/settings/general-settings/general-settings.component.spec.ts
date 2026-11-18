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
    // ngModel writes the value of the input asynchronously.
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const input = () => element.querySelector<HTMLInputElement>('input[name="timezone"]')!;
  const buttons = () =>
    element.querySelectorAll<HTMLButtonElement>('.general-settings-actions button');
  const options = () =>
    Array.from(
      element.querySelectorAll<HTMLButtonElement>('#timezone-suggestions [role="option"]'),
    );
  const errorText = () => element.querySelector('#timezone-error')?.textContent?.trim();

  /** Types the text as a user would, then lets ngModel settle. */
  async function type(value: string) {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function key(name: string) {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: name, cancelable: true }));
    fixture.detectChanges();
  }

  async function choose(value: string) {
    await type(value);
    const option = options().find(o => o.querySelector('span')?.textContent?.trim() === value);
    expect(option).withContext(`suggestion ${value}`).toBeDefined();
    option!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('shows the stored time zone in a text input with its UTC offset', async () => {
    await load();
    expect(element.querySelector('h2')?.textContent).toContain('generalSettings.title');
    expect(input().value).toBe('Indian/Antananarivo');
    expect(input().getAttribute('role')).toBe('combobox');
    expect(element.querySelector('#timezone-hint')?.textContent?.trim()).toBe('UTC+03:00');
    expect(element.querySelector('select')).toBeNull();
    expect(component.options.length).toBeGreaterThan(300);
    expect(component.dirty).toBeFalse();
    expect(buttons()[0].disabled).toBeTrue();
    expect(buttons()[1].disabled).toBeTrue();
  });

  it('accepts a stored time zone that the browser list does not have', async () => {
    await load('Etc/GMT-3');
    expect(input().value).toBe('Etc/GMT-3');
    expect(component.invalid).toBeFalse();
  });

  it('suggests matching time zones with their offset, names that start with the text first', async () => {
    await load();
    await type('paris');
    const names = options().map(o => o.querySelector('span')?.textContent?.trim());
    expect(names).toEqual(['Europe/Paris']);
    expect(options()[0].querySelector('small')?.textContent?.trim()).toMatch(/^UTC\+0[12]:00$/);
    expect(input().getAttribute('aria-expanded')).toBe('true');

    await type('new york');
    expect(options().map(o => o.querySelector('span')?.textContent?.trim())).toContain(
      'America/New_York',
    );

    await type('europe');
    expect(options().length).toBe(8);
    expect(options().every(o => o.textContent!.includes('Europe/'))).toBeTrue();
  });

  it('chooses a suggestion with the arrow keys and Enter, and closes with Escape', async () => {
    await load();
    await type('europe/pa');
    key('ArrowDown');
    expect(options()[0].classList).toContain('active');
    expect(input().getAttribute('aria-activedescendant')).toBe('timezone-option-0');
    key('Enter');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.timezone).toBe('Europe/Paris');
    expect(options().length).toBe(0);

    await type('asia');
    expect(options().length).toBeGreaterThan(0);
    key('Escape');
    expect(options().length).toBe(0);
  });

  it('refuses a name that is not in the list and blocks Save', async () => {
    await load();
    await type('Mars/Olympus_Mons');
    expect(component.invalid).toBeTrue();
    expect(errorText()).toBe('generalSettings.invalid');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(component.dirty).toBeTrue();
    expect(buttons()[1].disabled).toBeTrue();
    buttons()[1].click();
    http.expectNone(URL);

    await type('');
    expect(errorText()).toBe('generalSettings.invalid');
    expect(buttons()[1].disabled).toBeTrue();
  });

  it('accepts any case and writes the exact name on blur', async () => {
    await load();
    await type('europe/paris');
    expect(component.invalid).toBeFalse();
    expect(errorText()).toBeUndefined();
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.timezone).toBe('Europe/Paris');
    expect(input().value).toBe('Europe/Paris');
    expect(buttons()[1].disabled).toBeFalse();
  });

  it('shows the unsaved note and emits dirtyChange, then discards the change', async () => {
    await load();
    await choose('UTC');
    expect(component.dirty).toBeTrue();
    expect(dirtyEvents).toEqual([true]);
    expect(element.querySelector('.access-unsaved-note')).not.toBeNull();
    expect(buttons()[1].disabled).toBeFalse();

    buttons()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.timezone).toBe('Indian/Antananarivo');
    expect(input().value).toBe('Indian/Antananarivo');
    expect(component.dirty).toBeFalse();
    expect(dirtyEvents).toEqual([true, false]);
    expect(element.querySelector('.access-unsaved-note')).toBeNull();
  });

  it('saves the time zone in one PUT and shares the stored value', async () => {
    await load();
    await choose('Europe/Paris');
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
    await choose('UTC');
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
    expect(input()).not.toBeNull();
  });
});

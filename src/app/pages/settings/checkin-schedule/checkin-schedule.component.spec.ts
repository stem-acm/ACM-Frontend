import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '@/environments/environment';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { closedDay, defaultCheckinSchedule } from '@/testing/checkin-schedule';
import { CheckinScheduleComponent } from './checkin-schedule.component';
import { TranslateService } from '@ngx-translate/core';
import { AppSettingsService } from '@/app/services/app-settings.service';

const URL = `${environment.API_URL}/settings/checkin-schedule`;
const TIMEZONE_URL = `${environment.API_URL}/settings/timezone`;

describe('CheckinScheduleComponent', () => {
  let fixture: ComponentFixture<CheckinScheduleComponent>;
  let component: CheckinScheduleComponent;
  let element: HTMLElement;
  let http: HttpTestingController;
  let dirtyEvents: boolean[];

  function stored() {
    const schedule = defaultCheckinSchedule();
    schedule.sunday = closedDay();
    return schedule;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinScheduleComponent],
      providers: unitTestProviders,
    }).compileComponents();
    fixture = TestBed.createComponent(CheckinScheduleComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    dirtyEvents = [];
    component.dirtyChange.subscribe(dirty => dirtyEvents.push(dirty));
  });

  afterEach(() => http.verify());

  function flushTimezone(timezone = 'Indian/Antananarivo') {
    http.expectOne(TIMEZONE_URL).flush({ success: true, message: 'Time zone', data: { timezone } });
  }

  async function load(schedule = stored()) {
    fixture.detectChanges();
    expect(element.textContent).toContain('ux.loading');
    http.expectOne(URL).flush({ success: true, message: 'Check-in schedule', data: schedule });
    flushTimezone();
    fixture.detectChanges();
    // ngModel writes the values of the inputs asynchronously.
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function row(day: string): HTMLElement {
    return element.querySelector(`.checkin-day[data-day="${day}"]`) as HTMLElement;
  }

  function saveButton(): HTMLButtonElement {
    const buttons = element.querySelectorAll<HTMLButtonElement>('.checkin-schedule-actions button');
    return buttons[1];
  }

  function discardButton(): HTMLButtonElement {
    return element.querySelectorAll<HTMLButtonElement>('.checkin-schedule-actions button')[0];
  }

  function setTime(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('shows one row per day, Monday to Sunday, with the slots of each day', async () => {
    await load();
    const rows = Array.from(element.querySelectorAll<HTMLElement>('.checkin-day'));
    expect(rows.map(item => item.dataset['day'])).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
    expect(row('monday').querySelectorAll('.checkin-slot').length).toBe(2);
    const times = row('saturday').querySelectorAll<HTMLInputElement>('input[type="time"]');
    expect(Array.from(times).map(input => input.value)).toEqual(['09:00', '16:00']);
    expect(row('sunday').textContent).toContain('checkinSchedule.closedHint');
    expect(row('sunday').querySelector('.checkin-slot')).toBeNull();
    expect(element.querySelector('.access-unsaved-note')).toBeNull();
    expect(saveButton().disabled).toBeTrue();
    expect(discardButton().disabled).toBeTrue();
  });

  it('opens a closed day with one 08:00–12:00 slot and marks the form as unsaved', async () => {
    await load();
    const toggle = row('sunday').querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    toggle.click();
    fixture.detectChanges();

    expect(component.schedule!.sunday).toEqual({
      open: true,
      slots: [{ start: '08:00', end: '12:00' }],
    });
    expect(element.querySelector('.access-unsaved-note')?.textContent).toContain('access.unsaved');
    expect(dirtyEvents).toEqual([true]);
    expect(saveButton().disabled).toBeFalse();
  });

  it('keeps the slots of a day closed then opened again', async () => {
    await load();
    row('monday').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();
    expect(row('monday').textContent).toContain('checkinSchedule.closedHint');
    row('monday').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();
    expect(component.schedule!.monday).toEqual(defaultCheckinSchedule().monday);
    expect(component.dirty).toBeFalse();
    expect(dirtyEvents).toEqual([true, false]);
  });

  it('adds and removes slots', async () => {
    await load();
    const add = row('tuesday').querySelector<HTMLButtonElement>('.checkin-add')!;
    add.click();
    fixture.detectChanges();
    expect(row('tuesday').querySelectorAll('.checkin-slot').length).toBe(3);
    expect(component.schedule!.tuesday.slots[2]).toEqual({ start: '', end: '' });

    row('tuesday').querySelectorAll<HTMLButtonElement>('.checkin-remove')[0].click();
    fixture.detectChanges();
    expect(component.schedule!.tuesday.slots).toEqual([
      { start: '15:00', end: '18:00' },
      { start: '', end: '' },
    ]);
  });

  it('shows each error under its row and refuses to save until all rows are valid', async () => {
    await load();
    const errorOf = (day: string) => row(day).querySelector('.access-field-error')?.textContent;

    row('monday').querySelector<HTMLButtonElement>('.checkin-add')!.click();
    fixture.detectChanges();
    expect(errorOf('monday')).toContain('checkinSchedule.errors.empty');
    expect(saveButton().disabled).toBeTrue();

    const tuesday = row('tuesday').querySelectorAll<HTMLInputElement>('input[type="time"]');
    setTime(tuesday[1], '07:00');
    expect(errorOf('tuesday')).toContain('checkinSchedule.errors.order');

    const wednesday = row('wednesday').querySelectorAll<HTMLInputElement>('input[type="time"]');
    setTime(wednesday[2], '11:00');
    expect(errorOf('wednesday')).toContain('checkinSchedule.errors.overlap');

    const thursday = row('thursday');
    thursday.querySelectorAll<HTMLButtonElement>('.checkin-remove')[1].click();
    fixture.detectChanges();
    thursday.querySelectorAll<HTMLButtonElement>('.checkin-remove')[0].click();
    fixture.detectChanges();
    expect(errorOf('thursday')).toContain('checkinSchedule.errors.noSlot');

    expect(element.querySelectorAll('.access-field-error').length).toBe(4);
    expect(component.valid).toBeFalse();
    expect(saveButton().disabled).toBeTrue();
  });

  it('discards the changes', async () => {
    await load();
    row('friday').querySelector<HTMLButtonElement>('.checkin-remove')!.click();
    fixture.detectChanges();
    expect(component.dirty).toBeTrue();

    discardButton().click();
    fixture.detectChanges();
    expect(component.schedule).toEqual(stored());
    expect(component.dirty).toBeFalse();
    expect(dirtyEvents).toEqual([true, false]);
    expect(element.querySelector('.access-unsaved-note')).toBeNull();
  });

  it('saves the whole schedule in one PUT and keeps the answer as the stored value', async () => {
    await load();
    row('sunday').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    row('monday').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();

    saveButton().click();
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    const body = request.request.body;
    expect(Object.keys(body)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
    expect(body.monday).toEqual(closedDay());
    expect(body.sunday).toEqual({ open: true, slots: [{ start: '08:00', end: '12:00' }] });

    request.flush({ success: true, message: 'Check-in schedule updated', data: body });
    fixture.detectChanges();
    expect(component.dirty).toBeFalse();
    expect(component.schedule).toEqual(body);
    expect(element.querySelector('.access-notice')?.textContent).toContain('checkinSchedule.saved');
    expect(dirtyEvents).toEqual([true, false]);
  });

  it('shows the API error and keeps the changes', async () => {
    await load();
    row('monday').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();
    saveButton().click();
    http
      .expectOne(URL)
      .flush(
        { success: false, message: 'Add a slot or close the day.', data: null },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();
    expect(element.querySelector('.access-error')?.textContent).toContain(
      'Add a slot or close the day.',
    );
    expect(component.dirty).toBeTrue();
    expect(component.saving).toBeFalse();
  });

  it('offers a retry when the schedule cannot be loaded', () => {
    fixture.detectChanges();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    // The time zone request of the failed load is cancelled.
    expect(http.expectOne(TIMEZONE_URL).cancelled).toBeTrue();
    fixture.detectChanges();
    expect(element.textContent).toContain('ux.loadError');
    element.querySelector<HTMLButtonElement>('.acm-list-state button')!.click();
    http.expectOne(URL).flush({ success: true, message: '', data: stored() });
    flushTimezone();
    fixture.detectChanges();
    expect(element.querySelectorAll('.checkin-day').length).toBe(7);
  });

  it('shows the time zone of the app and follows a save in the General tab', async () => {
    await load();
    const zone = () => element.querySelector('.checkin-schedule-zone')?.textContent?.trim();
    expect(component.timezone()).toBe('Indian/Antananarivo');
    expect(zone()).toBe('checkinSchedule.timezone');
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      checkinSchedule: { timezone: 'Times are in {{timezone}}. One scan per slot.' },
    });
    translate.use('en');
    fixture.detectChanges();
    expect(zone()).toBe('Times are in Indian/Antananarivo. One scan per slot.');

    TestBed.inject(AppSettingsService).timezone.set('UTC');
    fixture.detectChanges();
    expect(zone()).toBe('Times are in UTC. One scan per slot.');
  });
});

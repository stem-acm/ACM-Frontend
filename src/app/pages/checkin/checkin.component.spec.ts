import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { StepperComponent } from '@/app/components/stepper/stepper.component';
import { CheckinSchedule, KioskSchedule, ScheduleSlot } from '@/app/interfaces/checkin-schedule';
import { CheckinScheduleService } from '@/app/services/checkin-schedule.service';
import { HttpResult } from '@/app/types/httpResult';
import { closedDay, defaultCheckinSchedule } from '@/testing/checkin-schedule';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { CheckinComponent } from './checkin.component';

@Component({ selector: 'app-stepper', standalone: true, template: '' })
class StepperStubComponent {
  @Input() slot: ScheduleSlot | null = null;
  @Input() timeZone: string | null = null;
}

type Answer = Observable<HttpResult<KioskSchedule>>;

/** The default time zone of the app: Mahajanga, UTC+3. */
const MAHAJANGA = 'Indian/Antananarivo';

const ok = (schedule: CheckinSchedule, timezone = MAHAJANGA): Answer =>
  of({ success: true, message: '', data: { timezone, schedule } });
const failure = (): Answer => throwError(() => new Error('offline'));

/** A wall-clock time in Mahajanga (UTC+3). */
const eat = (date: string, time: string) => new Date(`${date}T${time}+03:00`);

describe('CheckinComponent', () => {
  let fixture: ComponentFixture<CheckinComponent>;
  let component: CheckinComponent;
  let element: HTMLElement;
  let answers: Answer[];
  let getForCheckin: jasmine.Spy;

  beforeEach(async () => {
    answers = [];
    getForCheckin = jasmine
      .createSpy('getForCheckin')
      .and.callFake(() => answers.shift() ?? ok(defaultCheckinSchedule()));
    await TestBed.configureTestingModule({
      imports: [CheckinComponent],
      providers: [
        ...unitTestProviders,
        { provide: CheckinScheduleService, useValue: { getForCheckin } },
      ],
    })
      .overrideComponent(CheckinComponent, {
        remove: { imports: [StepperComponent] },
        add: { imports: [StepperStubComponent] },
      })
      .compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      days: {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
      },
      checkin: { hoursZone: 'Time zone: {{timezone}}', noOpening: 'No opening is scheduled.' },
      ux: { loading: 'Loading data…', loadError: 'Could not load.', retry: 'Retry' },
    });
    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(CheckinComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
  });

  /** Starts the page with the given schedule and shows it at `now`. */
  function start(schedule: CheckinSchedule, now: Date, timezone = MAHAJANGA) {
    answers.push(ok(schedule, timezone));
    fixture.detectChanges();
    component.updateOpeningState(now);
    fixture.detectChanges();
  }

  const stepper = () => element.querySelector('app-stepper');
  const closedHeading = () => element.querySelector('.closed-screen h1');
  const timer = () => element.querySelector('[role="timer"]');

  it('shows neither the stepper nor the closed screen while the schedule loads', () => {
    const pending = new Subject<HttpResult<KioskSchedule>>();
    answers.push(pending);
    fixture.detectChanges();
    expect(component.state).toBe('loading');
    expect(stepper()).toBeNull();
    expect(closedHeading()).toBeNull();
    expect(element.textContent).toContain('Loading data…');

    pending.next({
      success: true,
      message: '',
      data: { timezone: MAHAJANGA, schedule: defaultCheckinSchedule() },
    });
    component.updateOpeningState(eat('2026-11-10', '13:00:00'));
    fixture.detectChanges();
    expect(closedHeading()?.textContent).toBe('ACM Closed');
  });

  it('switches at each opening and closing boundary of the default schedule, Monday included', () => {
    start(defaultCheckinSchedule(), eat('2026-11-09', '09:00:00'));
    for (const day of [9, 10, 11, 12, 13]) {
      for (const [time, open] of [
        ['07:59:59', false],
        ['08:00:00', true],
        ['12:00:00', false],
        ['15:00:00', true],
        ['18:00:00', false],
      ] as const) {
        component.updateOpeningState(eat(`2026-11-${String(day).padStart(2, '0')}`, time));
        expect(component.isOpen).withContext(`${day} ${time}`).toBe(open);
      }
    }
  });

  it('counts down to the next slot', () => {
    start(defaultCheckinSchedule(), eat('2026-11-13', '12:00:00'));
    expect(component.countdown).toBe('03:00:00');
    expect(timer()?.textContent).toBe('03:00:00');
    expect(timer()?.getAttribute('aria-label')).toBe('Time until opening');
    expect(element.textContent).toContain('American Corner of Mahajanga opens in');

    component.updateOpeningState(eat('2026-11-14', '09:00:00'));
    expect(component.isOpen).toBeTrue();
    component.updateOpeningState(eat('2026-11-14', '16:00:00'));
    expect(component.isOpen).toBeFalse();
    expect(component.countdown).toBe('16:00:00');
  });

  it('counts down over closed days', () => {
    const schedule = defaultCheckinSchedule();
    schedule.sunday = closedDay();
    schedule.monday = closedDay();
    start(schedule, eat('2026-11-14', '16:00:00'));
    expect(component.countdown).toBe('64:00:00');
  });

  it('shows no countdown when every day is closed', () => {
    const schedule = defaultCheckinSchedule();
    for (const day of Object.keys(schedule) as (keyof CheckinSchedule)[]) {
      schedule[day] = closedDay();
    }
    start(schedule, eat('2026-11-10', '09:00:00'));
    expect(closedHeading()?.textContent).toBe('ACM Closed');
    expect(timer()).toBeNull();
    expect(component.hasNextOpening).toBeFalse();
    expect(element.textContent).toContain('No opening is scheduled.');
    expect(element.querySelector('.closed-hours')).toBeNull();
  });

  it('writes the opening hours with one fragment per group of days', () => {
    start(defaultCheckinSchedule(), eat('2026-11-10', '13:00:00'));
    const groups = Array.from(element.querySelectorAll('.closed-hours-group')).map(
      group => group.textContent,
    );
    expect(groups).toEqual([
      ' · Monday–Friday: 08:00–12:00, 15:00–18:00',
      ' · Saturday: 09:00–16:00',
      ' · Sunday: 08:00–12:00, 15:00–18:00',
    ]);
    expect(element.querySelector('.closed-hours')?.textContent?.trim()).toBe(
      'Time zone: Indian/Antananarivo · Monday–Friday: 08:00–12:00, 15:00–18:00 · Saturday: 09:00–16:00 · Sunday: 08:00–12:00, 15:00–18:00',
    );
  });

  it('reads the schedule in the time zone of the app', () => {
    // Tuesday 13:00 UTC: 16:00 in Mahajanga (open), 13:00 in UTC (closed until 15:00).
    const now = new Date('2026-11-10T13:00:00Z');
    start(defaultCheckinSchedule(), now);
    expect(component.isOpen).toBeTrue();

    answers.push(ok(defaultCheckinSchedule(), 'UTC'));
    component.loadSchedule();
    component.updateOpeningState(now);
    fixture.detectChanges();
    expect(component.timezone).toBe('UTC');
    expect(component.isOpen).toBeFalse();
    expect(component.countdown).toBe('02:00:00');
    expect(element.querySelector('.closed-hours')?.textContent).toContain('Time zone: UTC');
  });

  it('gives the open slot to the stepper', () => {
    start(defaultCheckinSchedule(), eat('2026-11-14', '10:00:00'));
    const stub = fixture.debugElement.children
      .map(child => child.componentInstance)
      .find(instance => instance instanceof StepperStubComponent) as StepperStubComponent;
    expect(stub).toBeDefined();
    expect(stub.slot).toEqual({ start: '09:00', end: '16:00' });
    expect(stub.timeZone).toBe(MAHAJANGA);
    expect(closedHeading()).toBeNull();
  });

  it('shows a retry button when the schedule cannot be loaded', () => {
    answers.push(failure());
    fixture.detectChanges();
    expect(component.state).toBe('error');
    expect(stepper()).toBeNull();
    expect(closedHeading()).toBeNull();
    expect(element.textContent).toContain('Could not load.');

    answers.push(failure());
    element.querySelector<HTMLButtonElement>('.closed-screen button')!.click();
    fixture.detectChanges();
    expect(getForCheckin).toHaveBeenCalledTimes(2);
    expect(component.state).toBe('error');

    answers.push(ok(defaultCheckinSchedule()));
    element.querySelector<HTMLButtonElement>('.closed-screen button')!.click();
    component.updateOpeningState(eat('2026-11-10', '13:00:00'));
    fixture.detectChanges();
    expect(getForCheckin).toHaveBeenCalledTimes(3);
    expect(closedHeading()?.textContent).toBe('ACM Closed');
  });

  it('keeps the last schedule when a later read fails', () => {
    start(defaultCheckinSchedule(), eat('2026-11-10', '13:00:00'));
    answers.push(failure());
    component.loadSchedule();
    fixture.detectChanges();
    expect(component.state).toBe('ready');
    expect(component.schedule).toEqual(defaultCheckinSchedule());
    expect(closedHeading()?.textContent).toBe('ACM Closed');
  });

  it('updates every second, reads the schedule every minute and stops when destroyed', fakeAsync(() => {
    fixture.detectChanges();
    expect(getForCheckin).toHaveBeenCalledTimes(1);
    const update = spyOn(component, 'updateOpeningState').and.callThrough();
    tick(1000);
    expect(update).toHaveBeenCalledTimes(1);
    tick(59_000);
    expect(getForCheckin).toHaveBeenCalledTimes(2);

    fixture.destroy();
    update.calls.reset();
    tick(60_000);
    expect(update).not.toHaveBeenCalled();
    expect(getForCheckin).toHaveBeenCalledTimes(2);
  }));
});

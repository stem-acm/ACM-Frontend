import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperComponent } from './stepper.component';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { Activity } from '@/app/interfaces/activity';
import { CheckinService } from '@/app/services/checkin.service';
import { NEVER } from 'rxjs';

describe('Stepper', () => {
  let component: StepperComponent;
  let fixture: ComponentFixture<StepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(StepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  for (const end of ['12:00', '18:00', '16:00']) {
    const hour = Number(end.slice(0, 2));

    it(`allows only minute 00 at the end hour of a slot ending ${end}`, () => {
      fixture.componentRef.setInput('slot', { start: '08:00', end });
      component.selectedTime.minute = 15;
      component.selectHour(hour);
      expect(component.availableMinutes).toEqual([0]);
      expect(component.selectedTime.minute).toBe(0);
      component.selectMinute(15);
      expect(component.selectedTime.minute).toBe(0);
      component.selectHour(hour - 1);
      expect(component.availableMinutes).toEqual(component.minutes);
    });

    it(`coerces the initial time at the end of a slot ending ${end}`, () => {
      fixture.componentRef.setInput('slot', { start: '08:00', end });
      component.currentHour = hour;
      component.currentTime = 10;
      component.setTimeInput();
      expect(component.selectedTime).toEqual({ hour, minute: 0 });
    });
  }

  it('stops the minutes at the end of a slot that ends at half past', () => {
    fixture.componentRef.setInput('slot', { start: '09:00', end: '16:30' });
    component.selectedTime.minute = 45;
    component.selectHour(16);
    expect(component.availableMinutes).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(component.selectedTime.minute).toBe(30);
    component.selectMinute(45);
    expect(component.selectedTime.minute).toBe(30);
  });

  it('offers the hours from now to the end of the slot', () => {
    fixture.componentRef.setInput('slot', { start: '08:00', end: '12:00' });
    component.currentHour = 9;
    component.currentTime = 0;
    component.setTimeInput();
    expect(component.hours).toEqual([9, 10, 11, 12]);
  });

  it('offers every hour until 23 and every minute without a slot', () => {
    fixture.componentRef.setInput('slot', null);
    component.currentHour = 20;
    component.currentTime = 0;
    component.setTimeInput();
    expect(component.hours).toEqual([20, 21, 22, 23]);
    component.selectHour(23);
    expect(component.availableMinutes).toEqual(component.minutes);
  });

  it('computes the hours again when the slot changes', () => {
    component.currentHour = 9;
    component.currentTime = 0;
    fixture.componentRef.setInput('slot', { start: '08:00', end: '12:00' });
    fixture.detectChanges();
    expect(component.hours).toEqual([9, 10, 11, 12]);
    fixture.componentRef.setInput('slot', { start: '08:00', end: '10:30' });
    fixture.detectChanges();
    expect(component.hours).toEqual([9, 10]);
  });

  describe('in the time zone of the app', () => {
    afterEach(() => jasmine.clock().uninstall());

    function at(iso: string) {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(iso));
    }

    it('takes the current hour from the zone, not from the device clock', () => {
      // 06:20 UTC is 09:20 in Mahajanga.
      at('2026-11-10T06:20:00Z');
      fixture.componentRef.setInput('slot', { start: '08:00', end: '12:00' });
      fixture.componentRef.setInput('timeZone', 'Indian/Antananarivo');
      fixture.detectChanges();
      expect(component.currentHour).toBe(9);
      expect(component.currentTime).toBe(20);
      expect(component.hours).toEqual([9, 10, 11, 12]);
      expect(component.selectedTime).toEqual({ hour: 9, minute: 25 });

      fixture.componentRef.setInput('timeZone', 'UTC');
      fixture.detectChanges();
      expect(component.currentHour).toBe(6);
      expect(component.hours).toEqual([6, 7, 8, 9, 10, 11, 12]);
    });

    it('sends the leaving time as the instant of that time in the zone', () => {
      at('2026-11-10T06:20:00Z');
      fixture.componentRef.setInput('timeZone', 'Indian/Antananarivo');
      fixture.detectChanges();
      component.selectedTime = { hour: 11, minute: 30 };
      expect(component.leavingTime().toISOString()).toBe('2026-11-10T08:30:00.000Z');

      fixture.componentRef.setInput('timeZone', 'UTC');
      fixture.detectChanges();
      component.selectedTime = { hour: 11, minute: 30 };
      expect(component.leavingTime().toISOString()).toBe('2026-11-10T11:30:00.000Z');
    });

    it('puts the leaving time in the check-in it sends', () => {
      at('2026-11-10T06:20:00Z');
      fixture.componentRef.setInput('timeZone', 'Indian/Antananarivo');
      fixture.detectChanges();
      const service = TestBed.inject(CheckinService);
      const create = spyOn(service, 'createCheckin').and.returnValue(NEVER);
      component.selectedActivities = [{ id: 4 } as Activity];
      component.selectedTime = { hour: 17, minute: 45 };
      component.badgeScanned(JSON.stringify({ registrationNumber: 12, signature: 'sig' }));
      expect(create).toHaveBeenCalledTimes(1);
      const payload = create.calls.mostRecent().args[0] as unknown as Record<string, Date>;
      expect(payload['checkOutTime'].toISOString()).toBe('2026-11-10T14:45:00.000Z');
      expect(payload['checkInTime'].toISOString()).toBe('2026-11-10T06:20:00.000Z');
    });
  });
});

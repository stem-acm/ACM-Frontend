import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperComponent } from './stepper.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

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
});

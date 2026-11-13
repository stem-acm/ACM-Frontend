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
  for (const day of ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
    const closingHours = day === 'saturday' ? [16] : [12, 18];
    for (const hour of closingHours) {
      it(`restricts ${day} ${hour}:00 to zero minutes`, () => {
        component.today = day;
        component.selectedTime.minute = 15;
        component.selectHour(hour);
        expect(component.availableMinutes).toEqual([0]);
        expect(component.selectedTime.minute).toBe(0);
        component.selectMinute(15);
        expect(component.selectedTime.minute).toBe(0);
        component.selectHour(hour - 1);
        expect(component.availableMinutes).toEqual(component.minutes);
      });

      it(`coerces the initial time at ${day} closing`, () => {
        component.today = day;
        component.currentHour = hour;
        component.currentTime = 10;
        component.setTimeInput();
        expect(component.selectedTime).toEqual({ hour, minute: 0 });
      });
    }
  }
});

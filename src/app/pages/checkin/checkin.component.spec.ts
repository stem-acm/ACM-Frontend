import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { CheckinComponent } from './checkin.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('CheckinComponent', () => {
  let component: CheckinComponent;
  let fixture: ComponentFixture<CheckinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('switches at each weekday opening and closing boundary', () => {
    for (const day of [10, 11, 12, 13]) {
      for (const [time, open] of [
        ['07:59:59', false],
        ['08:00:00', true],
        ['12:00:00', false],
        ['15:00:00', true],
        ['18:00:00', false],
      ] as const) {
        component.updateOpeningState(new Date(`2026-11-${day}T${time}+03:00`));
        expect(component.isOpen).withContext(`${day} ${time}`).toBe(open);
      }
    }
  });

  it('counts down through lunch and the closed weekend', () => {
    component.updateOpeningState(new Date('2026-11-13T12:00:00+03:00'));
    expect(component.countdown).toBe('03:00:00');
    component.updateOpeningState(new Date('2026-11-14T09:00:00+03:00'));
    expect(component.isOpen).toBeTrue();
    component.updateOpeningState(new Date('2026-11-14T16:00:00+03:00'));
    expect(component.isOpen).toBeFalse();
    expect(component.countdown).toBe('64:00:00');
  });

  it('refreshes automatically and releases its timer', fakeAsync(() => {
    component.ngOnDestroy();
    component.ngOnInit();
    const update = spyOn(component, 'updateOpeningState');
    tick(1000);
    expect(update).toHaveBeenCalled();
    fixture.destroy();
    update.calls.reset();
    tick(1000);
    expect(update).not.toHaveBeenCalled();
  }));
});

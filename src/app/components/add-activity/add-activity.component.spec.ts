import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddActivityComponent } from './add-activity.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('AddActivityComponent', () => {
  let component: AddActivityComponent;
  let fixture: ComponentFixture<AddActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddActivityComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(AddActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  for (const mode of ['insert', 'update'] as const) {
    it(`accepts 40 characters and rejects 41 before ${mode} submission`, () => {
      component.mode = mode;
      component.activity = {
        name: 'A'.repeat(40),
        description: 'Description',
        isPeriodic: true,
        dayOfWeek: 'tuesday',
        startTime: '09:00',
        endTime: '10:00',
      };
      expect(component.checkValidation()).toBeTrue();
      component.activity.name += 'A';
      expect(component.checkValidation()).toBeFalse();
      const insert = spyOn(component, 'insertActivity');
      const update = spyOn(component, 'updateActivity');
      component.saveActivity();
      expect(insert).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(component.loading).toBeFalse();
      component.activity.name = ' '.repeat(40);
      expect(component.checkValidation()).toBeFalse();
    });
  }

  it('preserves an existing overlength name and associates its visible error with the input', async () => {
    component.mode = 'update';
    component.activityToUpdate = {
      name: 'A'.repeat(41),
      description: 'Description',
      isPeriodic: true,
      dayOfWeek: 'tuesday',
      startTime: '09:00',
      endTime: '10:00',
    };
    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#name');
    expect(input.value).toBe('A'.repeat(41));
    expect(input.maxLength).toBe(40);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(
      'activity-name-count activity-name-length-error',
    );
    expect(fixture.nativeElement.querySelector('#activity-name-length-error')).toBeTruthy();
    component.activity.name = 'A'.repeat(40);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#activity-name-length-error')).toBeNull();
    expect(component.checkValidation()).toBeTrue();
  });
});

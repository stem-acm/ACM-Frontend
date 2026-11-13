import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityComponent } from './activity.component';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { AppComponent } from '@/app/app.component';

describe('ActivityComponent', () => {
  let component: ActivityComponent;
  let fixture: ComponentFixture<ActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityComponent],
      providers: [
        ...unitTestProviders,
        { provide: AppComponent, useValue: { showToast: jasmine.createSpy('showToast') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

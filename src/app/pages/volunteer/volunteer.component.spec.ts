import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteerComponent } from './volunteer.component';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { AppComponent } from '@/app/app.component';

describe('VolunteerComponent', () => {
  let component: VolunteerComponent;
  let fixture: ComponentFixture<VolunteerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerComponent],
      providers: [
        ...unitTestProviders,
        { provide: AppComponent, useValue: { showToast: jasmine.createSpy('showToast') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

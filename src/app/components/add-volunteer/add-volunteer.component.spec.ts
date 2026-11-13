import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddVolunteerComponent } from './add-volunteer.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('AddVolunteerComponent', () => {
  let component: AddVolunteerComponent;
  let fixture: ComponentFixture<AddVolunteerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddVolunteerComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(AddVolunteerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

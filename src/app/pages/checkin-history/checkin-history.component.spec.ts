import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinHistoryComponent } from './checkin-history.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('CheckinHistoryComponent', () => {
  let component: CheckinHistoryComponent;
  let fixture: ComponentFixture<CheckinHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinHistoryComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

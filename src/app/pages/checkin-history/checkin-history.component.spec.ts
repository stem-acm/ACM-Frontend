import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinHistoryComponent } from './checkin-history.component';

describe('CheckinHistoryComponent', () => {
  let component: CheckinHistoryComponent;
  let fixture: ComponentFixture<CheckinHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckinHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

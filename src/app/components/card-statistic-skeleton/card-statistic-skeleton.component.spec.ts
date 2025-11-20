import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardStatisticSkeletonComponent } from './card-statistic-skeleton.component';

describe('CardStatisticSkeletonComponent', () => {
  let component: CardStatisticSkeletonComponent;
  let fixture: ComponentFixture<CardStatisticSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardStatisticSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardStatisticSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

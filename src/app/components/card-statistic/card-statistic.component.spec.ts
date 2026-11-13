import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardStatisticComponent } from './card-statistic.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('CardStatisticComponent', () => {
  let component: CardStatisticComponent;
  let fixture: ComponentFixture<CardStatisticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardStatisticComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(CardStatisticComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', { title: '', value: 0, icon: '' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

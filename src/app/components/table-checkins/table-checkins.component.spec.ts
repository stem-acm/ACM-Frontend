import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCheckinsComponent } from './table-checkins.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('TableCheckinsComponent', () => {
  let component: TableCheckinsComponent;
  let fixture: ComponentFixture<TableCheckinsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCheckinsComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(TableCheckinsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('checkins', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

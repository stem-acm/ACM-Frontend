import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCheckinsComponent } from './table-checkins.component';

describe('TableCheckinsComponent', () => {
  let component: TableCheckinsComponent;
  let fixture: ComponentFixture<TableCheckinsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCheckinsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableCheckinsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

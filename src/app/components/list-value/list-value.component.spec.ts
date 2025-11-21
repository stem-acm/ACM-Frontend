import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListValueComponent } from './list-value.component';

describe('ListValueComponent', () => {
  let component: ListValueComponent;
  let fixture: ComponentFixture<ListValueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListValueComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

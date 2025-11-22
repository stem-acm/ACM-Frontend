import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableVolunteersComponent } from './table-volunteers.component';

describe('TableVolunteersComponent', () => {
  let component: TableVolunteersComponent;
  let fixture: ComponentFixture<TableVolunteersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableVolunteersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableVolunteersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableVolunteersComponent } from './table-volunteers.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('TableVolunteersComponent', () => {
  let component: TableVolunteersComponent;
  let fixture: ComponentFixture<TableVolunteersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableVolunteersComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(TableVolunteersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

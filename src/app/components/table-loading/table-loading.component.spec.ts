import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableLoadingComponent } from './table-loading.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('TableLoadingComponent', () => {
  let component: TableLoadingComponent;
  let fixture: ComponentFixture<TableLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableLoadingComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(TableLoadingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', { columns: [], textLoading: '' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

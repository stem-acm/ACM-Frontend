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
  it('renders a skeleton cell for every real column on each placeholder row', () => {
    fixture.componentRef.setInput('data', {
      columns: ['Name', 'Email', 'Role'],
      textLoading: 'Loading',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table').getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('tbody td').length).toBe(15);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Loading');
  });
});

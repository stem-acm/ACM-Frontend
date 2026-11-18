import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { TableMembersComponent } from './table-members.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Member } from '@/app/interfaces/member';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('TableMembersComponent', () => {
  let component: TableMembersComponent;
  let fixture: ComponentFixture<TableMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableMembersComponent, TranslateModule.forRoot()],
      providers: [
        ...unitTestProviders,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TableMembersComponent);
    component = fixture.componentInstance;
    component.data = []; // Initialize required input
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  function showRows(selected: boolean[]) {
    fixture.componentRef.setInput(
      'data',
      selected.map((value, index) => ({
        selected: value,
        member: {
          registrationNumber: index + 1,
          firstName: 'Member',
          lastName: String(index + 1),
        } as Member,
      })),
    );
    fixture.detectChanges();
  }

  const header = () =>
    fixture.nativeElement.querySelector('thead input[type="checkbox"]') as HTMLInputElement;

  it('combines selection and name in five columns and reflects partial and complete page selections', () => {
    spyOn(component.auth, 'can').and.returnValue(true);
    showRows([false, false]);
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(5);
    expect(header().checked).toBeFalse();
    expect(header().indeterminate).toBeFalse();
    showRows([true, false]);
    expect(header().checked).toBeFalse();
    expect(header().indeterminate).toBeTrue();
    showRows([true, true]);
    expect(header().checked).toBeTrue();
    expect(header().indeterminate).toBeFalse();
  });

  it('emits page selection independently of name sorting', () => {
    spyOn(component.auth, 'can').and.returnValue(true);
    showRows([false, false]);
    const selection = spyOn(component.pageSelectionChange, 'emit');
    const sorting = spyOn(component.sortChange, 'emit');
    header().click();
    expect(selection).toHaveBeenCalledOnceWith(true);
    expect(sorting).not.toHaveBeenCalled();
  });

  it('does not expose selection controls without card permissions', () => {
    spyOn(component.auth, 'can').and.returnValue(false);
    showRows([false]);
    expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]').length).toBe(0);
  });
});

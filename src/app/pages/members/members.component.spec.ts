import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MembersComponent } from './members.component';
import { MemberService } from '@/app/services/member.service';
import { VolunteerService } from '@/app/services/volunteer.service';
import { AppComponent } from '@/app/app.component';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Member } from '@/app/interfaces/member';

describe('MembersComponent', () => {
  let component: MembersComponent;
  let fixture: ComponentFixture<MembersComponent>;

  const mockMemberService = {
    getAllMembers: () => of({ success: true, data: [] as Member[], pagination: { total: 0 } }),
    getStudyPlaces: () => of({ success: true, data: [] }),
  };

  const mockVolunteerService = {
    getAllVolunteers: () => of({ success: true, data: [] }),
  };

  const mockAppComponent = {
    showToast: jasmine.createSpy('showToast'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersComponent, TranslateModule.forRoot(), HttpClientTestingModule],
      providers: [
        { provide: MemberService, useValue: mockMemberService },
        { provide: VolunteerService, useValue: mockVolunteerService },
        { provide: AppComponent, useValue: mockAppComponent },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function mockPages() {
    const members = [1, 2, 3].map(registrationNumber => ({
      registrationNumber,
      firstName: `Member ${registrationNumber}`,
      lastName: 'Test',
    })) as Member[];
    component.pageSize = 1;
    spyOn(mockMemberService, 'getAllMembers').and.callFake(() =>
      of({
        success: true,
        data: [{ ...members[component.currentPage - 1] }],
        pagination: { total: 3 },
      }),
    );
    component.getMemberList();
    return members;
  }

  it('keeps selections across three pages and prints every selected member once', () => {
    const members = mockPages();
    component.onMemberSelectionChange({ member: members[0], selected: true });
    component.changePage(2);
    component.onMemberSelectionChange({ member: members[1], selected: true });
    component.changePage(3);
    component.onMemberSelectionChange({ member: members[2], selected: true });
    component.changePage(1);

    expect(component.membersChooseList[0].selected).toBeTrue();
    component.onMemberSelectionChange({ member: members[0], selected: true });
    expect(component.countMembersChooseList(true)).toBe(3);
    component.printAllSelected();
    expect(component.membersClicked.map(member => member.registrationNumber)).toEqual([1, 2, 3]);
    expect(component.showCard).toBeTrue();

    component.onMemberSelectionChange({ member: members[0], selected: false });
    component.changePage(2);
    component.printAllSelected();
    expect(component.membersClicked.map(member => member.registrationNumber)).toEqual([2, 3]);
  });

  it('adds the current page with select all and clears selections from every page', () => {
    mockPages();
    component.selectAll(true);
    component.changePage(2);
    expect(component.countMembersChooseList(false)).toBe(1);
    component.selectAll(true);
    expect(component.countMembersChooseList(true)).toBe(2);
    component.selectAll(false);
    expect(component.countMembersChooseList(true)).toBe(0);
    expect(component.membersChooseList[0].selected).toBeFalse();
    component.changePage(1);
    expect(component.membersChooseList[0].selected).toBeFalse();
  });

  it('removes deleted members from the selection used for printing', () => {
    mockPages();
    component.selectAll(true);
    component.changePage(2);
    component.selectAll(true);
    component.onMemberDeleted(1);
    component.printAllSelected();
    expect(component.membersClicked.map(member => member.registrationNumber)).toEqual([2]);
  });

  it('shows an empty state when there are no members', () => {
    expect(fixture.nativeElement.querySelector('.acm-list-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.acm-list-state').textContent).toContain(
      'ux.noMembers',
    );
  });

  it('offers retry after the member list fails to load', () => {
    const getMembers = spyOn(mockMemberService, 'getAllMembers').and.returnValue(
      throwError(() => new Error('offline')),
    );
    component.getMemberList();
    fixture.detectChanges();

    expect(component.loadError).toBeTrue();
    expect(fixture.nativeElement.querySelector('.acm-list-state').textContent).toContain(
      'ux.loadError',
    );

    getMembers.and.returnValue(of({ success: true, data: [], pagination: { total: 0 } }));
    fixture.nativeElement.querySelector('.acm-list-state button').click();
    fixture.detectChanges();

    expect(component.loadError).toBeFalse();
    expect(fixture.nativeElement.querySelector('.acm-list-state').textContent).toContain(
      'ux.noMembers',
    );
  });
});

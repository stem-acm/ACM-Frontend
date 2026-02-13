import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MembersComponent } from './members.component';
import { MemberService } from '@/app/services/member.service';
import { VolunteerService } from '@/app/services/volunteer.service';
import { AppComponent } from '@/app/app.component';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('MembersComponent', () => {
  let component: MembersComponent;
  let fixture: ComponentFixture<MembersComponent>;

  const mockMemberService = {
    getAllMembers: () => of({ success: true, data: [], pagination: { total: 0 } }),
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
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberBadgeComponent } from './member-badge.component';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { Member } from '@/app/interfaces/member';

describe('MemberBadgeComponent', () => {
  let component: MemberBadgeComponent;
  let fixture: ComponentFixture<MemberBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberBadgeComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(MemberBadgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('member', {} as Member);
    fixture.componentRef.setInput('checkData', { stamp: false, signature: false });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberBadgeComponent } from './member-badge.component';

describe('MemberBadgeComponent', () => {
  let component: MemberBadgeComponent;
  let fixture: ComponentFixture<MemberBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberBadgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

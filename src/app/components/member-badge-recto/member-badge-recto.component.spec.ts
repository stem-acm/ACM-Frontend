import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberBadgeRectoComponent } from './member-badge-recto.component';

describe('MemberBadgeRectoComponent', () => {
  let component: MemberBadgeRectoComponent;
  let fixture: ComponentFixture<MemberBadgeRectoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberBadgeRectoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberBadgeRectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

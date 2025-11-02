import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberBadgeVersoComponent } from './member-badge-verso.component';

describe('MemberBadgeVersoComponent', () => {
  let component: MemberBadgeVersoComponent;
  let fixture: ComponentFixture<MemberBadgeVersoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberBadgeVersoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberBadgeVersoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

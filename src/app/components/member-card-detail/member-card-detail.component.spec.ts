import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberCardDetailComponent } from './member-card-detail.component';

describe('MemberCardDetailComponent', () => {
  let component: MemberCardDetailComponent;
  let fixture: ComponentFixture<MemberCardDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCardDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberCardDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

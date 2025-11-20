import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberDescriptionComponent } from './member-description.component';

describe('MemberDescriptionComponent', () => {
  let component: MemberDescriptionComponent;
  let fixture: ComponentFixture<MemberDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberDescriptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

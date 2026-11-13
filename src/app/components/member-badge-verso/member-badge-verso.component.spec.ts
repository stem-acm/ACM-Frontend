import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberBadgeVersoComponent } from './member-badge-verso.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('MemberBadgeVersoComponent', () => {
  let component: MemberBadgeVersoComponent;
  let fixture: ComponentFixture<MemberBadgeVersoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberBadgeVersoComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(MemberBadgeVersoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

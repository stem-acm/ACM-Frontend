import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberCardViewerComponent } from './member-card-viewer.component';

describe('MemberCardViewerComponent', () => {
  let component: MemberCardViewerComponent;
  let fixture: ComponentFixture<MemberCardViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCardViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberCardViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

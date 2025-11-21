import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcmLogoComponent } from './acm-logo.component';

describe('AcmLogoComponent', () => {
  let component: AcmLogoComponent;
  let fixture: ComponentFixture<AcmLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcmLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AcmLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

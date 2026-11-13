import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteerCertificateViewerComponent } from './volunteer-certificate-viewer.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('VolunteerCertificateViewerComponent', () => {
  let component: VolunteerCertificateViewerComponent;
  let fixture: ComponentFixture<VolunteerCertificateViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerCertificateViewerComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteerCertificateViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

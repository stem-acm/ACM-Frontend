import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScannerComponent } from './scanner.component';

describe('Scanner', () => {
  let component: ScannerComponent;
  let fixture: ComponentFixture<ScannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

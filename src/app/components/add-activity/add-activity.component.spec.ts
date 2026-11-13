import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddActivityComponent } from './add-activity.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('AddActivityComponent', () => {
  let component: AddActivityComponent;
  let fixture: ComponentFixture<AddActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddActivityComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(AddActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

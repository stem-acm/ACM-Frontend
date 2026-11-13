import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlexMenusComponent } from './flex-menus.component';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('FlexMenusComponent', () => {
  let component: FlexMenusComponent;
  let fixture: ComponentFixture<FlexMenusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlexMenusComponent],
      providers: unitTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(FlexMenusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

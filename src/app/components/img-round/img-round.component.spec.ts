import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImgRoundComponent } from './img-round.component';

describe('ImgRoundComponent', () => {
  let component: ImgRoundComponent;
  let fixture: ComponentFixture<ImgRoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImgRoundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImgRoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

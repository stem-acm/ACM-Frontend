import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextCursiveComponent } from './text-cursive.component';

describe('TextCursiveComponent', () => {
  let component: TextCursiveComponent;
  let fixture: ComponentFixture<TextCursiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextCursiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextCursiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

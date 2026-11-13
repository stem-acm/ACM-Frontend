import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppComponent } from '@/app/app.component';

import { MemberCardDetailComponent } from './member-card-detail.component';

describe('MemberCardDetailComponent', () => {
  let component: MemberCardDetailComponent;
  let fixture: ComponentFixture<MemberCardDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCardDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AppComponent, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberCardDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a not-found state without member actions for an unknown member', () => {
    fixture.componentRef.setInput('member', {
      registrationNumber: 999999999,
      firstName: '',
      lastName: '',
      title: '',
      gender: '',
      birthDate: '',
      birthPlace: '',
      address: '',
      occupation: 'unemployed',
      phoneNumber: '',
      studyOrWorkPlace: '',
      joinDate: '',
      profileImage: 'user.png',
    });
    fixture.componentRef.setInput('notFound', true);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('app-text-description')).not.toBeNull();
    expect(element.querySelector('dl')).toBeNull();
    expect(element.querySelector('[zType="destructive"]')).toBeNull();
    expect(element.querySelector('[routerLink="/members"]')).not.toBeNull();
  });
});

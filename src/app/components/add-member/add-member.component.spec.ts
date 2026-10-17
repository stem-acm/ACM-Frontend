import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMemberComponent } from './add-member.component';
import { MemberService } from '@/app/services/member.service';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('AddMemberComponent', () => {
  let component: AddMemberComponent;
  let fixture: ComponentFixture<AddMemberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMemberComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: MemberService,
          useValue: { addMember: () => of(), updateMember: () => of() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddMemberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('previews an imported image and allows it to be removed', () => {
    const photo = new File(['photo'], 'member.png', { type: 'image/png' });
    component.onPhotoSelected({
      target: { files: [photo], value: 'member.png' },
    } as unknown as Event);

    expect(component.selectedPhoto).toBe(photo);
    expect(component.photoPreviewUrl.startsWith('blob:')).toBeTrue();

    component.removePhoto();
    expect(component.selectedPhoto).toBeNull();
    expect(component.removeCurrentPhoto).toBeTrue();
  });

  it('rejects unsupported files before upload', () => {
    const file = new File(['bad'], 'member.svg', { type: 'image/svg+xml' });
    component.onPhotoSelected({
      target: { files: [file], value: 'member.svg' },
    } as unknown as Event);

    expect(component.selectedPhoto).toBeNull();
    expect(component.cameraError).toBeTruthy();
  });

  it('releases every camera track when capture is closed', () => {
    const stop = jasmine.createSpy('stop');
    component['cameraStream'] = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    component.cameraOpen = true;

    component.stopCamera();

    expect(stop).toHaveBeenCalled();
    expect(component.cameraOpen).toBeFalse();
  });
});

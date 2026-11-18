import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '@/environments/environment';
import { authInterceptor } from '@/app/auth.interceptor';
import { BACKGROUND_REQUEST, MemberPhotoService } from './member-photo.service';

describe('MemberPhotoService', () => {
  let service: MemberPhotoService;
  let http: HttpTestingController;
  const photoUrl = `${environment.FILE_URL}/members/photo.png`;

  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(MemberPhotoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    service.clear();
    localStorage.removeItem('token');
  });

  it('downloads a member photo with the token and gives a blob URL', async () => {
    const result = firstValueFrom(service.load(photoUrl));

    const request = http.expectOne(photoUrl);
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.context.get(BACKGROUND_REQUEST)).toBeTrue();
    request.flush(new Blob(['png'], { type: 'image/png' }));

    expect(await result).toMatch(/^blob:/);
  });

  it('downloads the same photo only once', async () => {
    const first = firstValueFrom(service.load(photoUrl));
    const second = firstValueFrom(service.load(photoUrl));
    http.expectOne(photoUrl).flush(new Blob(['png'], { type: 'image/png' }));

    expect(await second).toBe(await first);
  });

  it('shows the default avatar when the download fails, and tries again later', async () => {
    const failed = firstValueFrom(service.load(photoUrl));
    http.expectOne(photoUrl).flush(new Blob(), { status: 401, statusText: 'Unauthorized' });
    expect(await failed).toBe(service.defaultUrl);

    service.load(photoUrl).subscribe();
    http.expectOne(photoUrl).flush(new Blob(['png'], { type: 'image/png' }));
  });

  it('gives public files and empty values without a request', async () => {
    expect(await firstValueFrom(service.load(`${environment.FILE_URL}/user.png`))).toBe(
      `${environment.FILE_URL}/user.png`,
    );
    expect(await firstValueFrom(service.load(''))).toBe(service.defaultUrl);
    expect(await firstValueFrom(service.load('https://example.org/a.png'))).toBe(
      'https://example.org/a.png',
    );
    http.expectNone(() => true);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserQRCodeReader } from '@zxing/library';
import { QrCodeComponent } from './qr-code.component';

describe('QrCodeComponent', () => {
  let fixture: ComponentFixture<QrCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(QrCodeComponent);
    fixture.detectChanges();
  });

  async function setData(data: string | null | undefined) {
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function decode(): Promise<string> {
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    return (await new BrowserQRCodeReader().decodeFromImageElement(image)).getText();
  }

  it('renders signed badge data locally and decodes the exact check-in payload', async () => {
    const payload = JSON.stringify({ registrationNumber: 12345, signature: 'a'.repeat(64) });
    await setData(payload);

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.src).toMatch(/^data:image\/png;base64,/);
    expect(await decode()).toBe(payload);
    expect(image.naturalWidth).toBe(448);
  });

  it('replaces the QR code when the input changes', async () => {
    await setData('first badge');
    const firstUrl = fixture.componentInstance.qrUrl;
    await setData('second badge');
    expect(fixture.componentInstance.qrUrl).not.toBe(firstUrl);
    expect(await decode()).toBe('second badge');
  });

  it('does not render until data arrives and clears stale codes', async () => {
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    await setData('badge');
    for (const empty of ['', null, undefined]) {
      await setData(empty);
      expect(fixture.nativeElement.querySelector('img')).toBeNull();
    }
  });

  it('does not display an outdated result when data changes before generation finishes', async () => {
    fixture.componentRef.setInput('data', 'old badge');
    fixture.componentRef.setInput('data', 'current badge');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(await decode()).toBe('current badge');
  });

  it('does not restore a code cleared before generation finishes', async () => {
    fixture.componentRef.setInput('data', 'old badge');
    await setData('');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows an error instead of a stale code when data exceeds QR capacity', async () => {
    await setData('valid badge');
    await setData('x'.repeat(10000));
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    await setData('valid again');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(await decode()).toBe('valid again');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberBadgeRectoComponent } from './member-badge-recto.component';
import { Member } from '@/app/interfaces/member';

describe('MemberBadgeRectoComponent', () => {
  let component: MemberBadgeRectoComponent;
  let fixture: ComponentFixture<MemberBadgeRectoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberBadgeRectoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberBadgeRectoComponent);
    component = fixture.componentInstance;
    component.member = {
      firstName: 'Test',
      lastName: 'Member',
      birthPlace: 'Mahajanga',
      address: 'Short',
    } as Member;
    component.checkData = { stamp: false, signature: false };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shrinks long addresses to one line and restores the normal size for short addresses', async () => {
    const text = fixture.nativeElement.querySelector('.badge-address-text') as HTMLElement;
    const container = text.parentElement!;
    container.style.width = '160px';
    container.style.flex = 'none';
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const normalSize = parseFloat(getComputedStyle(text).fontSize);
    const originalHeight = container.getBoundingClientRect().height;

    component.member = {
      ...component.member,
      address: 'A very long physical address in Mahajanga '.repeat(8),
    };
    component.ngOnChanges();
    fixture.detectChanges();
    await Promise.resolve();
    expect(parseFloat(getComputedStyle(text).fontSize)).toBeLessThan(normalSize);
    expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(container.clientWidth - 8);
    expect(container.getBoundingClientRect().height).toBe(originalHeight);
    expect(text.textContent?.trim()).toBe(component.member.address.trim());

    component.member = { ...component.member, address: 'Short' };
    component.ngOnChanges();
    fixture.detectChanges();
    await Promise.resolve();
    expect(parseFloat(getComputedStyle(text).fontSize)).toBe(normalSize);
  });
});

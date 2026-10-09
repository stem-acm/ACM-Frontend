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
      address: 'Short address',
    } as Member;
    component.checkData = { stamp: false, signature: false };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps a fixed height and fits the complete long address', async () => {
    const card = fixture.nativeElement.querySelector('.badge-recto') as HTMLElement;
    expect(card.getBoundingClientRect().height).toBe(340);
    component.member.address = 'A long address in Mahajanga with additional directions '.repeat(12);
    fixture.detectChanges();
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const address = fixture.nativeElement.querySelector('.badge-address-text') as HTMLElement;
    expect(address.textContent?.trim()).toBe(component.member.address.trim());
    expect(address.scrollHeight).toBeLessThanOrEqual(address.parentElement!.clientHeight);
    expect(card.getBoundingClientRect().height).toBe(340);
  });
});

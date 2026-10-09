import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberCardViewerComponent } from './member-card-viewer.component';
import { Member } from '@/app/interfaces/member';

describe('MemberCardViewerComponent', () => {
  let component: MemberCardViewerComponent;
  let fixture: ComponentFixture<MemberCardViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCardViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberCardViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups selected member cards into pages of four without losing any cards', () => {
    component.member = Array.from({ length: 9 }, (_, i) => ({
      registrationNumber: i + 1,
    })) as Member[];
    expect(component.memberPages.map(page => page.length)).toEqual([4, 4, 1]);
    expect(component.memberPages.flat()).toEqual(component.member);
  });

  it('keeps the print frame until Chrome finishes printing', async () => {
    const content = document.createElement('div');
    content.id = 'badgeSectionToPrint';
    document.body.appendChild(content);

    const appendChild = document.body.appendChild.bind(document.body);
    let frame: HTMLIFrameElement | undefined;
    let printSpy: jasmine.Spy | undefined;
    spyOn(document.body, 'appendChild').and.callFake(node => {
      const appended = appendChild(node);
      if (node instanceof HTMLIFrameElement) {
        frame = node;
        printSpy = spyOn(node.contentWindow!, 'print').and.stub();
        spyOn(node.contentWindow!, 'focus').and.stub();
      }
      return appended;
    });

    try {
      component.print();
      await Promise.resolve();

      expect(printSpy).toHaveBeenCalled();
      expect(frame?.isConnected).toBeTrue();

      frame?.contentWindow?.dispatchEvent(new Event('afterprint'));
      expect(frame?.isConnected).toBeFalse();
    } finally {
      frame?.remove();
      content.remove();
    }
  });
});

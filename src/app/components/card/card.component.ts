import { ZardButtonComponent } from '@/shared/components/button';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '@/app/interfaces/member';
import { environment } from '@/environments/environment';
import { AsyncPipe } from '@angular/common';
import { MemberPhotoPipe } from '@/app/pipes/member-photo.pipe';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [ZardButtonComponent, AsyncPipe, MemberPhotoPipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  @Input() memberChoose!: { selected: boolean; member: Member };
  @Output() setSelectedMember = new EventEmitter<Member>();
  @Output() memberSelectionChange = new EventEmitter<{
    selected: boolean;
    member: Member;
  }>();

  private URL: string = environment.FILE_URL;

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = `${this.URL}/user.png`;
  }

  openCard(_member: Member) {
    this.setSelectedMember.emit(_member);
  }

  onCheckboxChange() {
    this.memberSelectionChange.emit({
      member: this.memberChoose.member,
      selected: !this.memberChoose.selected,
    });
  }
}

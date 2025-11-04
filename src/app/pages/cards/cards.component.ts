import { Component } from '@angular/core';
import { MemberBadgeComponent } from '../../components/member-badge/member-badge.component';
import { CardComponent } from '../../components/card/card.component';
import { Member } from '../../interfaces/member';
import { MemberService } from '../../services/member.service';
import { HttpResult } from '../../types/httpResult';
import { CommonModule } from '@angular/common';
import { MemberCardViewerComponent } from '../../components/member-card-viewer/member-card-viewer.component';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [MemberBadgeComponent, CardComponent, CommonModule, MemberCardViewerComponent],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css'
})
export class CardsComponent {
  public membersClicked!: Member[];
  private member!: Member[];
  public membersChooseList: {selected: boolean, member: Member}[] = [];
  public showCard: boolean = false;

  constructor(private Member: MemberService) {}

  ngOnInit() {
    this.getMemberList();
  }

  getMemberList() {
    this.Member.getAllMembers()
      .subscribe((result: HttpResult) => {
        if(result.success && result.data) {
          this.member = result.data;
          this.member.map((e) => {
            this.membersChooseList.push({
              selected: false,
              member: e
            });
          });
        }
      })
  }

  close(event: any) {
    this.showCard = false;
  }

  open(event: Member) {
    this.membersClicked = [event];
    this.showCard = true;
  }

  selectAll(select: boolean) {
    this.membersChooseList.map((e) => {
      e.selected = select;
    })
  }

  onMemberSelectionChange(event: { member: Member; selected: boolean }) {
    this.membersChooseList.map((e) => {
      if(e.member.registrationNumber === event.member.registrationNumber) {
        e.selected = event.selected;
      }
    })
  }

  printAllSelected() {
    const memberChoosed = this.membersChooseList.filter((e) => e.selected === true);
    this.membersClicked = memberChoosed.map((e) => e.member);
    this.showCard = true;
  }

  countMembersChooseList(select: boolean): number {
    const memberChoose = this.membersChooseList.filter((e) => e.selected === select);
    return memberChoose.length;
  }

}

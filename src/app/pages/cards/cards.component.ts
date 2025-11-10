import { Component } from '@angular/core';
import { MemberBadgeComponent } from '../../components/member-badge/member-badge.component';
import { CardComponent } from '../../components/card/card.component';
import { Member } from '../../interfaces/member';
import { MemberService } from '../../services/member.service';
import { HttpResult } from '../../types/httpResult';
import { CommonModule } from '@angular/common';
import { MemberCardViewerComponent } from '../../components/member-card-viewer/member-card-viewer.component';
import { CardSkeletonComponent } from '../../components/card-skeleton/card-skeleton.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [MemberBadgeComponent, CardComponent, CommonModule, MemberCardViewerComponent, CardSkeletonComponent, FormsModule],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css'
})
export class CardsComponent {
  public membersClicked!: Member[];
  private member!: Member[];
  public membersChooseList: {selected: boolean, member: Member}[] = [];
  public membersChooseListFilter: {selected: boolean, member: Member}[] = [];
  public showCard: boolean = false;
  public searchWord!: string;

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
          this.membersChooseListFilter = this.membersChooseList;
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

  search(keyWord: string) {
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.membersChooseListFilter = this.membersChooseList.filter((e) => e.member.firstName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 || e.member.lastName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1);
  }

}

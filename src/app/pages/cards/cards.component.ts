import { Component, inject, OnInit } from '@angular/core';
import { CardComponent } from '@/app/components/card/card.component';
import { Member } from '@/app/interfaces/member';
import { MemberService } from '@/app/services/member.service';
import { HttpResult } from '@/app/types/httpResult';
import { CommonModule } from '@angular/common';
import { MemberCardViewerComponent } from '@/app/components/member-card-viewer/member-card-viewer.component';
import { CardSkeletonComponent } from '@/app/components/card-skeleton/card-skeleton.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from '@/app/services/loading.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [
    CardComponent,
    CommonModule,
    MemberCardViewerComponent,
    CardSkeletonComponent,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css',
})
export class CardsComponent implements OnInit {
  public membersClicked!: Member[];
  private member!: Member[];
  public membersChooseList: { selected: boolean; member: Member }[] = [];
  public membersChooseListFilter: { selected: boolean; member: Member }[] = [];
  public showCard = false;
  public searchWord!: string;
  public isLoading = false;
  private searchSubject = new Subject<string>();

  public currentPage = 1;

  private memberService = inject(MemberService);
  private loadingService = inject(LoadingService);

  ngOnInit() {
    this.getMemberList();
    this.searchSubject.pipe(debounceTime(500)).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.getMemberList();
    });
  }

  getMemberList() {
    this.isLoading = true;
    this.loadingService.busy();
    this.memberService.getAllMembers().subscribe({
      next: (result: HttpResult<Member[]>) => {
        if (result.success && result.data) {
          this.member = result.data;
          this.membersChooseList = [];
          this.member.map(e => {
            this.membersChooseList.push({
              selected: false,
              member: e,
            });
          });
          this.membersChooseListFilter = this.membersChooseList;
        }
      },
      error: () => {
        this.isLoading = false;
        this.loadingService.idle();
      },
      complete: () => {
        this.isLoading = false;
        this.loadingService.idle();
      },
    });
  }

  close(_: boolean) {
    this.showCard = false;
  }

  open(event: Member) {
    this.membersClicked = [event];
    this.showCard = true;
  }

  selectAll(select: boolean) {
    this.membersChooseList.map(e => {
      e.selected = select;
    });
  }

  onMemberSelectionChange(event: { member: Member; selected: boolean }) {
    this.membersChooseList.map(e => {
      if (e.member.registrationNumber === event.member.registrationNumber) {
        e.selected = event.selected;
      }
    });
  }

  printAllSelected() {
    const memberChoosed = this.membersChooseList.filter(e => e.selected === true);
    this.membersClicked = memberChoosed.map(e => e.member);
    this.showCard = true;
  }

  countMembersChooseList(select: boolean): number {
    const memberChoose = this.membersChooseList.filter(e => e.selected === select);
    return memberChoose.length;
  }

  search(keyWord: string) {
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.membersChooseListFilter = this.membersChooseList.filter(
      e =>
        e.member.firstName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
        e.member.lastName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1,
    );
  }
}

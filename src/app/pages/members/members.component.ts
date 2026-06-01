import { Component, inject, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TableMembersComponent } from '@/app/components/table-members/table-members.component';
import { MemberService } from '@/app/services/member.service';
import { VolunteerService } from '@/app/services/volunteer.service';
import { HttpResult } from '@/app/types/httpResult';
import { Member } from '@/app/interfaces/member';
import { Volunteer } from '@/app/interfaces/volunteer';
import { AddMemberComponent } from '@/app/components/add-member/add-member.component';
import { AppComponent } from '@/app/app.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MemberCardViewerComponent } from '@/app/components/member-card-viewer/member-card-viewer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    TableMembersComponent,
    AddMemberComponent,
    TableLoadingComponent,
    MemberCardViewerComponent,
    FormsModule,
    TranslateModule,
    CommonModule,
  ],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css',
})
export class MembersComponent implements OnInit {
  protected Math = Math;
  private member!: Member[];
  public memberFilter!: Member[];
  public volunteers: Volunteer[] = [];
  public showAddForm = false;
  public searchWord = '';

  public currentPage = 1;
  public pageSize = 100;
  public totalMembers = 0;
  public isLoading = false;
  public pageInput = 1;
  private searchSubject = new Subject<string>();

  public membersClicked!: Member[];
  public membersChooseList: { selected: boolean; member: Member }[] = [];
  // public membersChooseListFilter: { selected: boolean; member: Member }[] = []; // Not needed as we use membersChooseList for the current page
  public showCard = false;

  private memberService = inject(MemberService);
  private volunteerService = inject(VolunteerService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.getMemberList();
    this.getVolunteersList();
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.getMemberList();
    });
  }

  getMemberList() {
    this.isLoading = true;
    const offset = (this.currentPage - 1) * this.pageSize;
    this.memberService.getAllMembers(offset, this.pageSize, this.searchWord).subscribe({
      next: (result: HttpResult<Member[]>) => {
        if (result.success && result.data) {
          this.member = result.data;
          this.memberFilter = this.member;

          // Initialize selection list for current page
          this.membersChooseList = this.member.map(m => ({
            selected: false,
            member: m,
          }));

          if (result.pagination) {
            this.totalMembers = result.pagination.total;

            // Handle edge case where current page is empty after delete
            if (this.member.length === 0 && this.currentPage > 1) {
              this.currentPage--;
              this.getMemberList();
              return;
            }
          }
        }
        this.pageInput = this.currentPage;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        // Optionally show error toast if not already handled by interceptor
      },
    });
  }

  getVolunteersList() {
    this.volunteerService.getAllVolunteers(0, 1000).subscribe((result: HttpResult<Volunteer[]>) => {
      if (result.success && result.data) {
        this.volunteers = result.data;
      }
    });
  }

  onMemberDeleted() {
    this.memberFilter = []; // Immediate visual feedback
    this.getMemberList();
    this.getVolunteersList();
  }

  changePage(page: number) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.pageInput = this.currentPage;
    this.getMemberList();
  }

  goToPage() {
    const page = Number(this.pageInput);
    if (!Number.isInteger(page) || page < 1) {
      this.pageInput = 1;
    } else if (page > this.totalPages) {
      this.pageInput = this.totalPages;
    }
    this.changePage(this.pageInput);
  }

  get totalPages(): number {
    return Math.ceil(this.totalMembers / this.pageSize);
  }

  addMember() {
    this.showAddForm = true;
  }

  cancelForm(event: boolean) {
    if (event) this.showAddForm = false;
  }

  closeForm(event: boolean) {
    if (event) {
      this.showAddForm = false;
      this.onMemberDeleted(); // Refresh everything
    }
  }

  showAlert(event: string) {
    this.app.showToast(event);
  }

  search(keyWord: string) {
    this.searchSubject.next(keyWord);
  }

  // Selection Logic
  selectAll(select: boolean) {
    this.membersChooseList.forEach(e => {
      e.selected = select;
    });
  }

  onMemberSelectionChange(event: { member: Member; selected: boolean }) {
    const item = this.membersChooseList.find(
      e => e.member.registrationNumber === event.member.registrationNumber,
    );
    if (item) {
      item.selected = event.selected;
    }
  }

  countMembersChooseList(select: boolean): number {
    return this.membersChooseList.filter(e => e.selected === select).length;
  }

  printAllSelected() {
    const memberChoosed = this.membersChooseList.filter(e => e.selected === true);
    this.membersClicked = memberChoosed.map(e => e.member);
    this.showCard = true;
  }

  close(_: boolean) {
    this.showCard = false;
  }

  open(member: Member) {
    this.membersClicked = [member];
    this.showCard = true;
  }
}

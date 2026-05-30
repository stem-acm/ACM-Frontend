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
  public pageSize = 80;
  public totalMembers = 0;
  public isLoading = false;
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
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        // Optionally show error toast if not already handled by interceptor
      },
    });
  }

  getVolunteersList() {
    this.volunteerService.getAllVolunteers().subscribe((result: HttpResult<Volunteer[]>) => {
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
    this.currentPage = page;
    this.getMemberList();
  }

  get totalPages(): number {
    return Math.ceil(this.totalMembers / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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

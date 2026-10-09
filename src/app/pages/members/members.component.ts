import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
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
import { AuthService } from '@/app/services/auth.service';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    ZardInputComponent,
    ZardButtonComponent,
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
  public auth = inject(AuthService);
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
  public loadError = false;
  public pageInput = 1;
  private searchSubject = new Subject<string>();

  public membersClicked!: Member[];
  public membersChooseList: { selected: boolean; member: Member }[] = [];
  private selectedMembers = new Map<number, Member>();
  // public membersChooseListFilter: { selected: boolean; member: Member }[] = []; // Not needed as we use membersChooseList for the current page
  public showCard = false;

  public studyPlaces: string[] = [];
  public selectedStudyPlaces: string[] = [];
  public studyPlacesDropdownOpen = false;
  public studyPlacesSearch = '';

  get filteredStudyPlaces(): string[] {
    if (!this.studyPlacesSearch) return this.studyPlaces;
    const search = this.studyPlacesSearch.toLowerCase();
    return this.studyPlaces.filter(place => place.toLowerCase().includes(search));
  }

  private memberService = inject(MemberService);
  private volunteerService = inject(VolunteerService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.getMemberList();
    this.getVolunteersList();
    this.getStudyPlacesList();
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.getMemberList();
    });
  }

  getStudyPlacesList() {
    this.memberService.getStudyPlaces().subscribe((result: HttpResult<string[]>) => {
      if (result.success && result.data) {
        this.studyPlaces = result.data;
      }
    });
  }

  toggleStudyPlace(place: string) {
    const idx = this.selectedStudyPlaces.indexOf(place);
    if (idx >= 0) {
      this.selectedStudyPlaces.splice(idx, 1);
    } else {
      this.selectedStudyPlaces.push(place);
    }
    this.currentPage = 1;
    this.getMemberList();
  }

  isStudyPlaceSelected(place: string): boolean {
    return this.selectedStudyPlaces.includes(place);
  }

  clearFilters() {
    const hadSearch = !!this.searchWord;
    this.selectedStudyPlaces = [];
    this.studyPlacesSearch = '';
    this.searchWord = '';
    this.currentPage = 1;
    if (hadSearch) this.searchSubject.next('');
    else this.getMemberList();
  }

  getMemberList() {
    this.isLoading = true;
    this.loadError = false;
    const offset = (this.currentPage - 1) * this.pageSize;
    const studyPlacesStr = this.selectedStudyPlaces.join(',');
    this.memberService
      .getAllMembers(offset, this.pageSize, this.searchWord, studyPlacesStr)
      .subscribe({
        next: (result: HttpResult<Member[]>) => {
          if (result.success && result.data) {
            this.member = result.data;
            this.memberFilter = this.member;
            this.totalMembers = result.pagination?.total ?? result.data.length;

            // Restore selections and refresh stored member details for this page.
            this.member.forEach(m => {
              if (m.registrationNumber != null && this.selectedMembers.has(m.registrationNumber)) {
                this.selectedMembers.set(m.registrationNumber, m);
              }
            });
            this.membersChooseList = this.member.map(m => ({
              selected:
                m.registrationNumber != null && this.selectedMembers.has(m.registrationNumber),
              member: m,
            }));

            if (result.pagination) {
              // Handle edge case where current page is empty after delete
              if (this.member.length === 0 && this.currentPage > 1) {
                this.currentPage--;
                this.getMemberList();
                return;
              }
            }
          } else {
            this.loadError = true;
          }
          this.pageInput = this.currentPage;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.loadError = true;
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

  onMemberDeleted(registrationNumber?: number) {
    if (registrationNumber != null) this.selectedMembers.delete(registrationNumber);
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
    if (!select) this.selectedMembers.clear();
    this.membersChooseList.forEach(e => {
      this.onMemberSelectionChange({ member: e.member, selected: select });
    });
  }

  onMemberSelectionChange(event: { member: Member; selected: boolean }) {
    const registrationNumber = event.member.registrationNumber;
    if (registrationNumber == null) return;
    if (event.selected) {
      this.selectedMembers.set(registrationNumber, event.member);
    } else {
      this.selectedMembers.delete(registrationNumber);
    }
    const item = this.membersChooseList.find(
      e => e.member.registrationNumber === event.member.registrationNumber,
    );
    if (item) {
      item.selected = event.selected;
    }
  }

  countMembersChooseList(select: boolean): number {
    return select
      ? this.selectedMembers.size
      : this.membersChooseList.filter(e => !e.selected).length;
  }

  printAllSelected() {
    this.membersClicked = Array.from(this.selectedMembers.values());
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

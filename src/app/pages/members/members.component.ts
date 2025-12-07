import { Component, inject, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TableMembersComponent } from '@/app/components/table-members/table-members.component';
import { MemberService } from '@/app/services/member.service';
import { HttpResult } from '@/app/types/httpResult';
import { Member } from '@/app/interfaces/member';
import { AddMemberComponent } from '@/app/components/add-member/add-member.component';
import { AppComponent } from '@/app/app.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    TableMembersComponent,
    AddMemberComponent,
    TableLoadingComponent,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css',
})
export class MembersComponent implements OnInit {
  protected Math = Math;
  private member!: Member[];
  public memberFilter!: Member[];
  public showAddForm = false;
  public searchWord!: string;

  public currentPage = 1;
  public pageSize = 10;
  public totalMembers = 0;
  public isLoading = false;
  private searchSubject = new Subject<string>();

  private memberService = inject(MemberService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.getMemberList();
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.getMemberList();
    });
  }

  getMemberList() {
    this.isLoading = true;
    const offset = (this.currentPage - 1) * this.pageSize;
    this.memberService
      .getAllMembers(offset, this.pageSize, this.searchWord)
      .subscribe((result: HttpResult<Member[]>) => {
        if (result.success && result.data) {
          this.member = result.data;
          this.memberFilter = this.member;
          if (result.pagination) {
            this.totalMembers = result.pagination.total;
          }
        }
        this.isLoading = false;
      });
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
    this.app.showToast('Canceled form...');
  }

  closeForm(event: boolean) {
    if (event) {
      this.showAddForm = false;
      this.getMemberList(); // Refresh the members list
    }
  }

  showAlert(event: string) {
    this.app.showToast(event);
  }

  search(keyWord: string) {
    this.searchSubject.next(keyWord);
  }
}

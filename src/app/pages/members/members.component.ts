import { Component, inject, OnInit } from '@angular/core';
import { TableMembersComponent } from '@/app/components/table-members/table-members.component';
import { MemberService } from '@/app/services/member.service';
import { HttpResult } from '@/app/types/httpResult';
import { Member } from '@/app/interfaces/member';
import { AddMemberComponent } from '@/app/components/add-member/add-member.component';
import { AppComponent } from '@/app/app.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [TableMembersComponent, AddMemberComponent, TableLoadingComponent, FormsModule],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css',
})
export class MembersComponent implements OnInit {
  private member!: Member[];
  public memberFilter!: Member[];
  public showAddForm = false;
  public searchWord!: string;

  private memberService = inject(MemberService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.getMemberList();
  }

  getMemberList() {
    this.memberService.getAllMembers().subscribe((result: HttpResult<Member[]>) => {
      if (result.success && result.data) {
        this.member = result.data;
        this.memberFilter = this.member;
      }
    });
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
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.memberFilter = this.member.filter(
      e =>
        e.firstName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
        e.lastName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1,
    );
  }
}

import { Component, inject } from '@angular/core';
import { TableMembersComponent } from '../../components/table-members/table-members.component';
import { MemberService } from '../../services/member.service';
import { HttpResult } from '../../types/httpResult';
import { Member } from '../../interfaces/member';
import { AddMemberComponent } from '../../components/add-member/add-member.component';
import { AppComponent } from '../../app.component';
import { TableLoadingComponent } from '../../components/table-loading/table-loading.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [TableMembersComponent, AddMemberComponent, TableLoadingComponent, FormsModule],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css'
})
export class MembersComponent {
  private member!: Member[];
  public memberFilter!: Member[];
  public showAddForm: boolean = false;
  public searchWord!: string;

  constructor(private Member: MemberService, private app: AppComponent) {}

  ngOnInit() {
    this.getMemberList();
  }

  getMemberList() {
    this.Member.getAllMembers()
      .subscribe((result: HttpResult<Member[]>) => {
        if(result.success && result.data) {
          this.member = result.data;
          this.memberFilter = this.member;          
        }
      })
  }

  addMember() {
    this.showAddForm = true;
  }

  cancelForm(event: any) {
    if(event) this.showAddForm = false;
    this.app.showToast('Canceled form...');
  }

  showAlert(event: any) {
    this.app.showToast(event);
  }

  search(keyWord: string) {
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.memberFilter = this.member.filter(
      (e) => e.firstName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
      e.lastName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
      e.occupation.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
      e.studyOrWorkPlace?.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1
  );
  }

}

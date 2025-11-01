import { Component, inject } from '@angular/core';
import { TableMembersComponent } from '../../components/table-members/table-members.component';
import { MemberService } from '../../services/member.service';
import { HttpResult } from '../../types/httpResult';
import { Member } from '../../interfaces/member';
import { AddMemberComponent } from '../../components/add-member/add-member.component';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [TableMembersComponent, AddMemberComponent],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css'
})
export class MembersComponent {
  private member!: Member[];
  public memberFilter!: Member[];
  public showAddForm: boolean = false;

  constructor(private Member: MemberService, private app: AppComponent) {}

  ngOnInit() {
    this.getMemberList();
  }

  getMemberList() {
    this.Member.getAllMembers()
      .subscribe((result: HttpResult) => {
        if(result.success && result.data) {
          this.member = result.data;
          this.memberFilter = this.member;
          // console.log(this.member);
          
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

}

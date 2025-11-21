import { Component, inject, OnInit } from '@angular/core';
import { MemberService } from '@/app/services/member.service';
import { HttpResult } from '@/app/types/httpResult';
import { Member } from '@/app/interfaces/member';
import { ActivatedRoute } from '@angular/router';
import { MemberCardDetailComponent } from '@/app/components/member-card-detail/member-card-detail.component';
import dayjs from 'dayjs';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [MemberCardDetailComponent],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.css',
})
export class ProfilComponent implements OnInit {
  public member!: Member;
  private registrationNumber!: string;

  private memberService = inject(MemberService);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.registrationNumber = this.route.snapshot.paramMap.get('reg_number')!;
    this.getMemberInfo(this.registrationNumber);
  }

  convertDate(date: Date | string) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  getMemberInfo(registrationNumber: string) {
    this.memberService
      .getMemberByRegistrationNumber(registrationNumber)
      .subscribe((result: HttpResult<Member>) => {
        if (result.success && result.data) {
          this.member = result.data;
          this.member.birthDate = this.convertDate(this.member.birthDate);
          this.member.joinDate = this.convertDate(this.member.joinDate);
        } else {
          this.member = {
            registrationNumber: this.registrationNumber,
            id: 0,
            firstName: '404',
            lastName: '',
            birthDate: '',
            birthPlace: '',
            address: '',
            occupation: 'unemployed',
            phoneNumber: '',
            studyOrWorkPlace: '',
            joinDate: '',
            profileImage: 'user.png',
          };
        }
      });
  }
}

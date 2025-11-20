import { Component, OnInit } from '@angular/core';
import { MemberService } from '../../services/member.service';
import { HttpResult } from '../../types/httpResult';
import { Member } from '../../interfaces/member';
import { AcmLogoComponent } from '../../components/acm-logo/acm-logo.component';
import { ActivatedRoute } from '@angular/router';
import { MemberCardDetailComponent } from '../../components/member-card-detail/member-card-detail.component';
import dayjs from 'dayjs';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [AcmLogoComponent, MemberCardDetailComponent],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.css',
})
export class ProfilComponent implements OnInit {
  public member!: Member;
  private registrationNumber!: string;

  constructor(
    private Member: MemberService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.registrationNumber = this.route.snapshot.paramMap.get('reg_number')!;
    this.getMemberInfo(this.registrationNumber);
  }

  convertDate(date: Date | string) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  getMemberInfo(registrationNumber: string) {
    this.Member.getMemberByRegistrationNumber(registrationNumber).subscribe(
      (result: HttpResult<Member>) => {
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
      },
    );
  }
}

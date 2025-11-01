import { Component } from '@angular/core';
import { MemberService } from '../../services/member.service';
import { HttpResult } from '../../types/httpResult';
import { Member } from '../../interfaces/member';
import { AcmLogoComponent } from '../../components/acm-logo/acm-logo.component';
import { ActivatedRoute } from '@angular/router';
import { MemberCardComponent } from '../../components/member-card/member-card.component';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [AcmLogoComponent, MemberCardComponent],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.css'
})
export class ProfilComponent {
  public member!: Member;
  private registrationNumber!: string;

  constructor(private Member: MemberService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.registrationNumber = this.route.snapshot.paramMap.get('reg_number')!;
    this.getMemberInfo(this.registrationNumber);
  }

  getMemberInfo(registrationNumber: string) {
    this.Member.getMemberByRegistrationNumber(registrationNumber)
      .subscribe((result: HttpResult) => {
        if(result.success && result.data) {
          this.member = result.data;
        } else {
          this.member = {
            registrationNumber: this.registrationNumber,
              firstName: '404',
              lastName: '',
              birthDate: '',
              birthPlace: '',
              address: '',
              occupation: 'unemployed',
              phoneNumber: '',
              studyOrWorkPlace: '',
              joinDate: '',
              profileImage: 'user.png'
          }
        }
      })
  }

}

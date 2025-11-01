import { Component, Input } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Member } from '../../interfaces/member';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-table-members',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './table-members.component.html',
  styleUrl: './table-members.component.css'
})
export class TableMembersComponent {
  private URL: string = environment.FILEURL;
  public userImg: string = `${this.URL}/user.png`;
  @Input() data!: Member[];

  getfileUrl(fileName: any) {
    return `${this.URL}/${fileName ??= 'user.png'}`;
  }
}

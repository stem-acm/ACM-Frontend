import { AppComponent } from '@/app/app.component';
import { AddVolunteerComponent } from '@/app/components/add-volunteer/add-volunteer.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { TableVolunteersComponent } from '@/app/components/table-volunteers/table-volunteers.component';
import { Volunteer } from '@/app/interfaces/volunteer';
import { VolunteerService } from '@/app/services/volunteer.service';
import { HttpResult } from '@/app/types/httpResult';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-volunteer',
  standalone: true,
  imports: [FormsModule, TableLoadingComponent, TableVolunteersComponent, AddVolunteerComponent],
  templateUrl: './volunteer.component.html',
  styleUrl: './volunteer.component.css',
})
export class VolunteerComponent implements OnInit {
  public volunteers!: Volunteer[];
  public volunteersFilter!: Volunteer[];
  public searchWord!: string;
  public showAddForm = false;

  private volunteerService = inject(VolunteerService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.getVolunteerList();
  }

  getVolunteerList() {
    this.volunteerService.getAllVolunteers().subscribe((result: HttpResult<Volunteer[]>) => {
      if (result.success && result.data) {
        this.volunteers = result.data;
        this.volunteersFilter = this.volunteers;
      }
    });
  }

  addVolunteer() {
    this.showAddForm = true;
  }

  cancelForm(event: boolean) {
    if (event) this.showAddForm = false;
    this.app.showToast('Canceled form...');
  }

  closeForm(event: boolean) {
    if (event) {
      this.showAddForm = false;
      this.getVolunteerList(); // Refresh the members list
    }
  }

  showAlert(event: any) {
    this.app.showToast(event);
  }

  search(keyWord: string) {
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.volunteersFilter = this.volunteers.filter(
      e =>
        e.Member?.firstName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
        e.Member?.lastName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1,
    );
  }
}

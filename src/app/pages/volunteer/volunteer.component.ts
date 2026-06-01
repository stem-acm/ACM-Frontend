import { CommonModule } from '@angular/common';
import { AppComponent } from '@/app/app.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { TableVolunteersComponent } from '@/app/components/table-volunteers/table-volunteers.component';
import { VolunteerCertificateViewerComponent } from '@/app/components/volunteer-certificate-viewer/volunteer-certificate-viewer.component';
import { AddVolunteerComponent } from '@/app/components/add-volunteer/add-volunteer.component';
import { Volunteer } from '@/app/interfaces/volunteer';
import { VolunteerService } from '@/app/services/volunteer.service';
import { HttpResult } from '@/app/types/httpResult';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-volunteer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableLoadingComponent,
    TableVolunteersComponent,
    VolunteerCertificateViewerComponent,
    AddVolunteerComponent,
    TranslateModule,
  ],
  templateUrl: './volunteer.component.html',
  styleUrl: './volunteer.component.css',
})
export class VolunteerComponent implements OnInit {
  protected Math = Math;
  public volunteers!: Volunteer[];
  public volunteerChooosed!: Volunteer;
  public searchWord = '';
  public showCertificate = false;
  public showAddForm = false;

  public currentPage = 1;
  public pageSize = 100;
  public totalVolunteers = 0;
  public isLoading = false;
  public pageInput = 1;
  private searchSubject = new Subject<string>();

  private volunteerService = inject(VolunteerService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.getVolunteerList();
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.getVolunteerList();
    });
  }

  getVolunteerList() {
    this.isLoading = true;
    const offset = (this.currentPage - 1) * this.pageSize;
    this.volunteerService.getAllVolunteers(offset, this.pageSize, this.searchWord).subscribe({
      next: (result: HttpResult<Volunteer[]>) => {
        if (result.success && result.data) {
          this.volunteers = result.data;

          if (result.pagination) {
            this.totalVolunteers = result.pagination.total;

            if (this.volunteers.length === 0 && this.currentPage > 1) {
              this.currentPage--;
              this.getVolunteerList();
              return;
            }
          }
        }
        this.pageInput = this.currentPage;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalVolunteers / this.pageSize);
  }

  changePage(page: number) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.pageInput = this.currentPage;
    this.getVolunteerList();
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

  addVolunteer() {
    this.showAddForm = true;
  }

  cancelAddForm(event: boolean) {
    if (event) this.showAddForm = false;
  }

  closeForm(event: boolean) {
    if (event) {
      this.showAddForm = false;
      this.getVolunteerList();
    }
  }

  showAlert(event: string) {
    this.app.showToast(event);
  }

  search(keyWord: string) {
    this.searchSubject.next(keyWord);
  }

  setShowCertificate(event: Volunteer) {
    this.showCertificate = true;
    this.volunteerChooosed = event;
  }

  cancelForm(event: boolean) {
    if (event) this.showCertificate = false;
  }
}

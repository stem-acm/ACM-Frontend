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
  private allVolunteers: Volunteer[] = [];
  public displayedVolunteers: Volunteer[] = [];
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
      this.updateDisplayedVolunteers();
    });
  }

  getVolunteerList() {
    this.isLoading = true;
    this.volunteerService.getAllVolunteers(0, 1000).subscribe({
      next: (result: HttpResult<Volunteer[]>) => {
        if (result.success && result.data) {
          this.allVolunteers = result.data;
          this.currentPage = 1;
          this.updateDisplayedVolunteers();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalVolunteers / this.pageSize));
  }

  changePage(page: number) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.pageInput = this.currentPage;
    this.updateDisplayedVolunteers();
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

  private updateDisplayedVolunteers() {
    const filtered = this.filterVolunteers(this.searchWord);
    this.totalVolunteers = filtered.length;

    if (this.totalVolunteers > 0 && this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayedVolunteers = filtered.slice(start, end);
    this.pageInput = this.currentPage;
  }

  private filterVolunteers(keyword: string): Volunteer[] {
    if (!keyword) return this.allVolunteers;
    const lower = keyword.toLowerCase();
    return this.allVolunteers.filter(
      e =>
        e.Member?.firstName?.toLowerCase().includes(lower) ||
        e.Member?.lastName?.toLowerCase().includes(lower),
    );
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

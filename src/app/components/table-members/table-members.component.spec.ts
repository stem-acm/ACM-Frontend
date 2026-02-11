import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { TableMembersComponent } from './table-members.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TableMembersComponent', () => {
  let component: TableMembersComponent;
  let fixture: ComponentFixture<TableMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableMembersComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TableMembersComponent);
    component = fixture.componentInstance;
    component.data = []; // Initialize required input
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

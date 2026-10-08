import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MembersComponent } from './pages/members/members.component';
import { ProfilComponent } from './pages/profil/profil.component';
import { AuthComponent } from './pages/auth/auth.component';
import { CardsComponent } from './pages/cards/cards.component';
import { ActivityComponent } from './pages/activity/activity.component';
import { CheckinComponent } from './pages/checkin/checkin.component';
import { VolunteerComponent } from './pages/volunteer/volunteer.component';
import { CheckinHistoryComponent } from './pages/checkin-history/checkin-history.component';
import { VolunteerCertificateViewerComponent } from './components/volunteer-certificate-viewer/volunteer-certificate-viewer.component';
import { guestGuard, permissionGuard } from './permission.guard';
import { SettingsComponent, canDeactivateSettings } from './pages/settings/settings.component';
import { MyProfileComponent } from './pages/my-profile/my-profile.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthComponent,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [permissionGuard],
    data: { permission: 'dashboard.view' },
  },
  {
    path: 'members',
    component: MembersComponent,
    canActivate: [permissionGuard],
    data: { permission: 'members.view' },
  },
  {
    path: 'volunteer',
    component: VolunteerComponent,
    canActivate: [permissionGuard],
    data: { permission: 'volunteers.view' },
  },
  {
    path: 'volunteer/:id/certificate',
    component: VolunteerCertificateViewerComponent,
    canActivate: [permissionGuard],
    data: { permission: 'volunteers.certificate' },
  },
  {
    path: 'profil/:reg_number',
    component: ProfilComponent,
    canActivate: [permissionGuard],
    data: { permission: 'members.view' },
  },
  {
    path: 'cards',
    component: CardsComponent,
    canActivate: [permissionGuard],
    data: { permission: 'members.cards' },
  },
  {
    path: 'activity',
    component: ActivityComponent,
    canActivate: [permissionGuard],
    data: { permission: 'activities.view' },
  },
  {
    path: 'checkin',
    component: CheckinComponent,
    canActivate: [permissionGuard],
    data: { permission: 'checkins.create' },
  },
  {
    path: 'checkin-history',
    component: CheckinHistoryComponent,
    canActivate: [permissionGuard],
    data: { permission: 'checkins.view' },
  },
  {
    path: 'setting',
    component: SettingsComponent,
    canActivate: [permissionGuard],
    canDeactivate: [canDeactivateSettings],
    data: { permission: 'settings.manage' },
  },
  {
    path: 'my-profile',
    component: MyProfileComponent,
    canActivate: [permissionGuard],
    data: { permission: 'profile.edit' },
  },
];

import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MembersComponent } from './pages/members/members.component';
import { ProfilComponent } from './pages/profil/profil.component';
import { AuthComponent } from './pages/auth/auth.component';
import { CardsComponent } from './pages/cards/cards.component';
import { ActivityComponent } from './pages/activity/activity.component';
import { CheckinComponent } from './pages/checkin/checkin.component';
import { VolunteerComponent } from './pages/volunteer/volunteer.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthComponent,
  },
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'members',
    component: MembersComponent,
  },
  {
    path: 'volunteer',
    component: VolunteerComponent,
  },
  {
    path: 'profil/:reg_number',
    component: ProfilComponent,
  },
  {
    path: 'cards',
    component: CardsComponent,
  },
  {
    path: 'activity',
    component: ActivityComponent,
  },
  {
    path: 'checkin',
    component: CheckinComponent,
  },
];

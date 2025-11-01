import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MembersComponent } from './pages/members/members.component';
import { ProfilComponent } from './pages/profil/profil.component';
import { AuthComponent } from './pages/auth/auth.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
        {
        path: 'members',
        component: MembersComponent
    },
    {
        path: 'profil/:reg_number',
        component: ProfilComponent
    },
    {
        path: 'auth',
        component: AuthComponent
    }
];

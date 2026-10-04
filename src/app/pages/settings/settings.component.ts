import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@/environments/environment';
import { HttpResult } from '@/app/types/httpResult';
import { AuthService } from '@/app/services/auth.service';

type Role = 'admin' | 'intern' | 'volunteer';
type Policy = { role: Role; active: boolean; permissions: Record<string, boolean> };
type Account = { id: number; username: string; email: string; role: Role; active: boolean };

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  private url = `${environment.API_URL}/settings`;

  roles: Role[] = ['admin', 'intern', 'volunteer'];
  selectedRole: Role = 'intern';
  policies: Policy[] = [];
  accounts: Account[] = [];
  message = '';
  error = '';
  saving = false;
  creating = false;
  newAccount: { username: string; email: string; password: string; role: Role } = {
    username: '',
    email: '',
    password: '',
    role: 'volunteer',
  };

  groups = [
    { label: 'access.groups.dashboard', features: [['dashboard.view', 'access.actions.view']] },
    {
      label: 'access.groups.members',
      features: [
        ['members.view', 'access.actions.view'],
        ['members.create', 'access.actions.create'],
        ['members.update', 'access.actions.update'],
        ['members.delete', 'access.actions.delete'],
        ['members.cards', 'access.actions.cards'],
      ],
    },
    {
      label: 'access.groups.volunteers',
      features: [
        ['volunteers.view', 'access.actions.view'],
        ['volunteers.create', 'access.actions.create'],
        ['volunteers.update', 'access.actions.update'],
        ['volunteers.delete', 'access.actions.delete'],
        ['volunteers.certificate', 'access.actions.certificate'],
      ],
    },
    {
      label: 'access.groups.activities',
      features: [
        ['activities.view', 'access.actions.view'],
        ['activities.create', 'access.actions.create'],
        ['activities.update', 'access.actions.update'],
        ['activities.delete', 'access.actions.delete'],
      ],
    },
    {
      label: 'access.groups.checkins',
      features: [
        ['checkins.create', 'access.actions.create'],
        ['checkins.view', 'access.actions.history'],
        ['checkins.delete', 'access.actions.delete'],
      ],
    },
    { label: 'access.groups.settings', features: [['settings.manage', 'access.actions.manage']] },
  ];

  get selectedPolicy(): Policy | undefined {
    return this.policies.find(policy => policy.role === this.selectedRole);
  }

  featureChanged(policy: Policy, feature: string): void {
    const permissions = policy.permissions;
    if (feature === 'members.cards' && permissions[feature]) permissions['members.view'] = true;
    if (feature === 'volunteers.certificate' && permissions[feature]) {
      permissions['volunteers.view'] = true;
    }
    if (feature === 'checkins.create' && permissions[feature])
      permissions['activities.view'] = true;
    if (feature === 'members.view' && !permissions[feature]) permissions['members.cards'] = false;
    if (feature === 'volunteers.view' && !permissions[feature]) {
      permissions['volunteers.certificate'] = false;
    }
    if (feature === 'activities.view' && !permissions[feature]) {
      permissions['checkins.create'] = false;
    }
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.http.get<HttpResult<Policy[]>>(`${this.url}/roles`).subscribe({
      next: result => (this.policies = result.data),
      error: error => this.fail(error),
    });
    this.http.get<HttpResult<Account[]>>(`${this.url}/users`).subscribe({
      next: result => (this.accounts = result.data),
      error: error => this.fail(error),
    });
  }

  savePolicy(): void {
    const policy = this.selectedPolicy;
    if (!policy) return;
    this.saving = true;
    this.http
      .put<HttpResult<Policy>>(`${this.url}/roles/${policy.role}`, {
        active: policy.active,
        permissions: policy.permissions,
      })
      .subscribe({
        next: result => {
          this.policies = this.policies.map(item =>
            item.role === policy.role ? result.data : item,
          );
          this.saving = false;
          this.message = 'access.saved';
          this.error = '';
          if (policy.role === this.auth.user?.role) this.auth.verifyToken().subscribe();
        },
        error: error => {
          this.saving = false;
          this.fail(error);
        },
      });
  }

  saveAccount(account: Account): void {
    this.http
      .put<HttpResult<Account>>(`${this.url}/users/${account.id}`, {
        role: account.role,
        active: account.active,
      })
      .subscribe({
        next: result => {
          Object.assign(account, result.data);
          this.message = 'access.saved';
          this.error = '';
        },
        error: error => {
          this.fail(error);
          this.reload();
        },
      });
  }

  createAccount(): void {
    this.creating = true;
    this.http
      .post<HttpResult<Account>>(`${environment.API_URL}/auth/register`, this.newAccount)
      .subscribe({
        next: () => {
          this.creating = false;
          this.message = 'access.created';
          this.error = '';
          this.newAccount = { username: '', email: '', password: '', role: 'volunteer' };
          this.reload();
        },
        error: error => {
          this.creating = false;
          this.fail(error);
        },
      });
  }

  private fail(error: { error?: { message?: string } }): void {
    this.message = '';
    this.error = error.error?.message || 'Unable to save changes';
  }
}

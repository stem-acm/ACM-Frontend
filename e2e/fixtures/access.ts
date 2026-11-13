import { expect, Page } from '@playwright/test';
import { Role } from './api';

/** English tab label of each role on /setting (access.roles.*). */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  intern: 'Intern',
  volunteer: 'Volunteer',
};

/**
 * Each feature of a role policy, with the English heading of its group and the
 * label of its checkbox on /setting (SettingsComponent.groups, access.groups.*,
 * access.actions.*).
 */
export const FEATURE_LABELS: Record<string, { group: string; label: string }> = {
  'profile.edit': { group: 'My profile', label: 'Edit own profile' },
  'dashboard.view': { group: 'Dashboard', label: 'View' },
  'members.view': { group: 'Members', label: 'View' },
  'members.create': { group: 'Members', label: 'Create' },
  'members.update': { group: 'Members', label: 'Edit' },
  'members.delete': { group: 'Members', label: 'Delete' },
  'members.cards': { group: 'Members', label: 'Cards and QR codes' },
  'volunteers.view': { group: 'Volunteers', label: 'View' },
  'volunteers.create': { group: 'Volunteers', label: 'Create' },
  'volunteers.update': { group: 'Volunteers', label: 'Edit' },
  'volunteers.delete': { group: 'Volunteers', label: 'Delete' },
  'volunteers.certificate': { group: 'Volunteers', label: 'Certificates' },
  'activities.view': { group: 'Activities', label: 'View' },
  'activities.create': { group: 'Activities', label: 'Create' },
  'activities.update': { group: 'Activities', label: 'Edit' },
  'activities.delete': { group: 'Activities', label: 'Delete' },
  'checkins.create': { group: 'Check-ins', label: 'Create' },
  'checkins.view': { group: 'Check-ins', label: 'History and live updates' },
  'checkins.delete': { group: 'Check-ins', label: 'Delete' },
  'books.view': { group: 'Books', label: 'View' },
  'books.create': { group: 'Books', label: 'Create' },
  'books.update': { group: 'Books', label: 'Edit' },
  'settings.manage': { group: 'Settings and accounts', label: 'Manage access' },
};

/** Main menu entries of the navbar (FlexMenusComponent.menus) with their feature. */
export const MENU_ENTRIES: { label: string; feature: string }[] = [
  { label: 'Home', feature: 'dashboard.view' },
  { label: 'Members', feature: 'members.view' },
  { label: 'Volunteers', feature: 'volunteers.view' },
  { label: 'Activities', feature: 'activities.view' },
  { label: 'Checkin History', feature: 'checkins.view' },
  { label: 'Books', feature: 'books.view' },
];

/** User menu entries of the navbar (links) with their feature. */
export const USER_MENU_ENTRIES: { label: string; feature: string }[] = [
  { label: 'My profile', feature: 'profile.edit' },
  { label: 'Settings', feature: 'settings.manage' },
];

export function navbar(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation' });
}

/**
 * Asserts that the navbar shows exactly the menu entries allowed by the
 * permissions, opens the user menu and asserts the same for its links, and
 * that no navbar entry leads to the Cards page.
 */
export async function expectNavbarFollows(page: Page, permissions: Record<string, boolean>) {
  const nav = navbar(page);
  // The menu entries are anchors rendered with the z-button directive (role "button").
  const shown = MENU_ENTRIES.filter(entry => permissions[entry.feature]);
  const hidden = MENU_ENTRIES.filter(entry => !permissions[entry.feature]);
  for (const entry of shown) {
    await expect(nav.getByRole('button', { name: entry.label, exact: true })).toBeVisible();
  }
  for (const entry of hidden) {
    await expect(nav.getByRole('button', { name: entry.label, exact: true })).toHaveCount(0);
  }

  await nav.getByRole('button', { name: 'Open user menu' }).click();
  const userShown = USER_MENU_ENTRIES.filter(entry => permissions[entry.feature]);
  const userHidden = USER_MENU_ENTRIES.filter(entry => !permissions[entry.feature]);
  for (const entry of userShown) {
    await expect(nav.getByRole('link', { name: entry.label, exact: true })).toBeVisible();
  }
  for (const entry of userHidden) {
    await expect(nav.getByRole('link', { name: entry.label, exact: true })).toHaveCount(0);
  }
  await expect(nav.getByRole('link', { name: 'Cards', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Cards', exact: true })).toHaveCount(0);
  await expect(nav.locator('a[href="/cards"]')).toHaveCount(0);
}

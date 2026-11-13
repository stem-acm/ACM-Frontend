import { Page } from '@playwright/test';
import { Activity, ApiHelper, Checkin, Member } from './fixtures/api';
import { installFakeCamera } from './fixtures/fake-camera';
import { fetchQrPayload, QrPayload, qrImageDataUrl } from './fixtures/qr';
import { expect, test } from './fixtures/test';

/*
 * The browser sends checkInTime, and the API checks it in Africa/Nairobi time
 * (EAT, UTC+3). Each test fixes the browser clock on its own date of October
 * 2026 and uses its own member, so the "one scan per slot" rule never leaks
 * between tests.
 */

/** A wall-clock time in EAT, e.g. eat('2026-10-06', '09:00'). */
function eat(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+03:00`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Step 1: one tile (role button) per activity of the day. */
function activityTile(page: Page, activity: Activity) {
  return page.getByRole('button', { name: new RegExp(escapeRegExp(activity.name), 'i') });
}

function stepHeading(page: Page, name: RegExp) {
  return page.getByRole('heading', { name });
}

const CHOOSE_ACTIVITY = /^CHOOSE ACTIVITIES/;
const LEAVING_TIME = /^LEAVING TIME/;
const WELCOME = /^WELCOME \/ TONGASOA$/;
const CLOSED = /^ACM Closed$/;

/** Outside the opening hours /checkin shows the closed screen and no stepper. */
async function expectClosedScreen(page: Page): Promise<void> {
  await expect(stepHeading(page, CLOSED)).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Time until opening' })).toBeVisible();
  await expect(stepHeading(page, CHOOSE_ACTIVITY)).toHaveCount(0);
}

/** The toast (role alert) that shows API refusals. */
function toast(page: Page) {
  return page.getByRole('alert');
}

/** Title of the error modal (it has no dialog role). */
function errorModalTitle(page: Page, name: RegExp) {
  return page.getByRole('heading', { name });
}

interface Scene {
  member: Member;
  activity: Activity;
}

/** A fresh member and a fresh activity of every day, removed by `cleanup`. */
async function createScene(api: ApiHelper, firstName: string): Promise<Scene> {
  const member = await api.createMember({ firstName });
  const activity = await api.createActivity({ emoji: '🧪' });
  return { member, activity };
}

async function cleanup(api: ApiHelper, scene: Scene, ...others: Member[]): Promise<void> {
  for (const member of [scene.member, ...others]) {
    for (const checkin of await api.getMemberCheckins(member.registrationNumber)) {
      await api.deleteCheckin(checkin.id);
    }
    await api.deleteMemberIfExists(member.registrationNumber);
  }
  await api.deleteActivityIfExists(scene.activity.id);
}

/** Fixes the browser clock, shows the QR image to the fake camera and opens /checkin. */
async function openCheckin(page: Page, at: Date, qr: QrPayload | string): Promise<void> {
  await page.clock.setFixedTime(at);
  await installFakeCamera(page, await qrImageDataUrl(qr));
  await page.goto('/checkin');
}

interface LeavingTime {
  /** Texts shown by the hour and minute parts before the change. */
  shown: { hour: string; minute: string };
  /** New hour, when it differs from the shown one. */
  hour?: string;
  minute: string;
}

/**
 * Runs the stepper: chooses the activity, optionally sets the leaving time,
 * goes to the scan step, and waits for the check-in request the scan sends.
 */
async function chooseActivityAndScan(page: Page, activity: Activity, leaving?: LeavingTime) {
  await activityTile(page, activity).click();
  await expect(stepHeading(page, LEAVING_TIME)).toBeVisible();
  if (leaving) {
    // The hour and minute parts are role-button divs named by the number they show.
    const hour = leaving.hour ?? leaving.shown.hour;
    if (leaving.hour) {
      // The hour part pulses (CSS animation) until chosen, so it is never "stable".
      await page
        .getByRole('button', { name: leaving.shown.hour, exact: true })
        .click({ force: true });
      await page.getByRole('button', { name: leaving.hour, exact: true }).click();
    }
    // The minute part pulses too once the hour is chosen.
    await page
      .getByRole('button', { name: leaving.shown.minute, exact: true })
      .click({ force: true });
    await page.getByRole('button', { name: leaving.minute, exact: true }).click();
    await expect(page.getByRole('button', { name: hour, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: leaving.minute, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Next Arrow' }).click();
}

/** Waits for the POST /api/checkins the scan sends. */
function checkinPost(page: Page) {
  return page.waitForResponse(
    response =>
      response.request().method() === 'POST' && /\/api\/checkins\/?$/.test(response.url()),
  );
}

async function memberCheckins(api: ApiHelper, member: Member): Promise<Checkin[]> {
  return api.getMemberCheckins(member.registrationNumber);
}

test.describe('F7 Check-in', () => {
  test('F7.1 a valid badge on an allowed slot shows the welcome step and creates the check-in', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Welcome');
    const at = eat('2026-10-06', '09:00'); // Tuesday
    try {
      await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));
      await chooseActivityAndScan(page, scene.activity);

      await expect(stepHeading(page, WELCOME)).toBeVisible();

      const checkins = await memberCheckins(api, scene.member);
      expect(checkins).toHaveLength(1);
      expect(checkins[0].registrationNumber).toBe(scene.member.registrationNumber);
      expect(checkins[0].activityId).toBe(scene.activity.id);
      expect(new Date(checkins[0].checkInTime).toISOString()).toBe(at.toISOString());
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.2 a leaving time after the check-in time is stored as checkOutTime', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Leaving');
    const at = eat('2026-10-07', '09:32'); // Wednesday
    try {
      await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));
      // At 09:32 the picker shows 09:40; the leaving time is set to 11:30.
      await chooseActivityAndScan(page, scene.activity, {
        shown: { hour: '09', minute: '40' },
        hour: '11',
        minute: '30',
      });

      await expect(stepHeading(page, WELCOME)).toBeVisible();
      const checkins = await memberCheckins(api, scene.member);
      expect(checkins).toHaveLength(1);
      expect(new Date(checkins[0].checkInTime).toISOString()).toBe(at.toISOString());
      expect(checkins[0].checkOutTime, 'stored checkOutTime').not.toBeNull();
      expect(new Date(checkins[0].checkOutTime as string).toISOString()).toBe(
        eat('2026-10-07', '11:30').toISOString(),
      );
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.3 a leaving time before the check-in time is refused with an error and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Early');
    const at = eat('2026-10-08', '09:32'); // Thursday
    try {
      await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));
      const post = checkinPost(page);
      // At 09:32 the picker shows 09:40; the leaving time is set to 09:00.
      await chooseActivityAndScan(page, scene.activity, {
        shown: { hour: '09', minute: '40' },
        minute: '00',
      });

      expect((await post).ok(), 'the API refuses the check-in').toBe(false);
      await expect
        .soft(toast(page), 'the refusal is shown')
        .toContainText(/check-out time must be after check-in time/i);
      await expect(stepHeading(page, WELCOME)).toHaveCount(0);
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.4 a QR code with a wrong signature shows "invalid QR code" and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Forged');
    const at = eat('2026-10-09', '09:00'); // Friday
    try {
      const genuine = await fetchQrPayload(api, scene.member.registrationNumber);
      const forged: QrPayload = {
        registrationNumber: genuine.registrationNumber,
        signature: genuine.signature.startsWith('0')
          ? `1${genuine.signature.slice(1)}`
          : `0${genuine.signature.slice(1)}`,
      };
      await openCheckin(page, at, forged);
      await chooseActivityAndScan(page, scene.activity);

      await expect(errorModalTitle(page, /invalid QR code/i)).toBeVisible();
      await expect(stepHeading(page, WELCOME)).toHaveCount(0);
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.5 a QR code without signature (plain number) is refused and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Unsigned');
    const at = eat('2026-10-13', '09:00'); // Tuesday
    try {
      await openCheckin(page, at, String(scene.member.registrationNumber));
      await chooseActivityAndScan(page, scene.activity);

      // The refusal is either the invalid-badge modal or a toast with the API reason.
      await expect(
        errorModalTitle(page, /invalid QR code/i)
          .or(toast(page))
          .first(),
      ).toBeVisible();
      await expect(stepHeading(page, WELCOME)).toHaveCount(0);
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.6 an unknown registration number in a correctly formed QR code shows an error and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Ghost');
    const at = eat('2026-10-14', '09:00'); // Wednesday
    try {
      // A genuine signed payload whose member no longer exists.
      const payload = await fetchQrPayload(api, scene.member.registrationNumber);
      await api.deleteMember(scene.member.registrationNumber);
      expect(await api.status(`members/${payload.registrationNumber}`)).toBe(404);

      await openCheckin(page, at, payload);
      const post = checkinPost(page);
      await chooseActivityAndScan(page, scene.activity);

      expect((await post).ok(), 'the API refuses the check-in').toBe(false);
      await expect.soft(toast(page), 'the refusal is shown').toContainText(/member not found/i);
      await expect(stepHeading(page, WELCOME)).toHaveCount(0);
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.7 on a Monday the check-in page shows the closed screen and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Monday');
    const at = eat('2026-10-05', '09:00'); // Monday
    try {
      await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));

      await expectClosedScreen(page);
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.8 on Tuesday at 13:00, between the windows, the check-in page shows the closed screen and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Noon');
    const at = eat('2026-10-20', '13:00'); // Tuesday
    try {
      await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));

      await expectClosedScreen(page);
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.9 a check-in on Saturday at 10:00 is accepted and on Saturday at 17:00 the closed screen is shown', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Saturday');
    const morningAt = eat('2026-10-10', '10:00'); // Saturday
    const eveningAt = eat('2026-10-10', '17:00');
    try {
      await openCheckin(
        page,
        morningAt,
        await fetchQrPayload(api, scene.member.registrationNumber),
      );
      await chooseActivityAndScan(page, scene.activity);
      await expect(stepHeading(page, WELCOME)).toBeVisible();
      const accepted = await memberCheckins(api, scene.member);
      expect(accepted).toHaveLength(1);
      expect(new Date(accepted[0].checkInTime).toISOString()).toBe(morningAt.toISOString());

      await page.clock.setFixedTime(eveningAt);
      await page.goto('/checkin');

      await expectClosedScreen(page);
      expect(await memberCheckins(api, scene.member)).toHaveLength(1);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.10 a second scan of the same member in the same slot is refused as already scanned', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Twice');
    const at = eat('2026-10-15', '09:00'); // Thursday
    try {
      await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));
      await chooseActivityAndScan(page, scene.activity);
      await expect(stepHeading(page, WELCOME)).toBeVisible();
      // The stepper goes back to the first step by itself after the welcome step.
      await expect(stepHeading(page, CHOOSE_ACTIVITY)).toBeVisible();

      const post = checkinPost(page);
      await chooseActivityAndScan(page, scene.activity);

      expect((await post).ok(), 'the API refuses the second scan').toBe(false);
      await expect(page.getByText(/already scanned/i)).toBeVisible();
      await expect(stepHeading(page, WELCOME)).toHaveCount(0);
      expect(await memberCheckins(api, scene.member)).toHaveLength(1);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.11 the same member on the same day in the other slot (AM then PM) is accepted twice', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Halfdays');
    const morningAt = eat('2026-10-16', '09:00'); // Friday
    const afternoonAt = eat('2026-10-16', '15:30');
    try {
      await openCheckin(
        page,
        morningAt,
        await fetchQrPayload(api, scene.member.registrationNumber),
      );
      await chooseActivityAndScan(page, scene.activity);
      await expect(stepHeading(page, WELCOME)).toBeVisible();
      await expect.poll(async () => (await memberCheckins(api, scene.member)).length).toBe(1);

      await page.clock.setFixedTime(afternoonAt);
      await page.reload();
      await chooseActivityAndScan(page, scene.activity);
      await expect(stepHeading(page, WELCOME)).toBeVisible();

      const checkins = await memberCheckins(api, scene.member);
      expect(checkins).toHaveLength(2);
      expect(checkins.map(c => new Date(c.checkInTime).toISOString()).sort()).toEqual([
        morningAt.toISOString(),
        afternoonAt.toISOString(),
      ]);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.12 an activity created through the API while the stepper is open appears without reload', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Liveactivity');
    let created: Activity | undefined;
    try {
      const sseOpened = page.waitForResponse(
        response => response.url().includes('/sse/activities') && response.ok(),
      );
      await openCheckin(
        page,
        eat('2026-10-27', '09:00'), // Tuesday
        await fetchQrPayload(api, scene.member.registrationNumber),
      );
      await sseOpened;
      await expect(activityTile(page, scene.activity)).toBeVisible();
      // A marker that a reload would erase.
      await page.evaluate(
        () => ((window as unknown as { e2eNoReload: boolean }).e2eNoReload = true),
      );

      created = await api.createActivity({ emoji: '🛰️' });

      await expect(activityTile(page, created)).toBeVisible();
      await expect(stepHeading(page, CHOOSE_ACTIVITY)).toBeVisible();
      expect(
        await page.evaluate(() => (window as unknown as { e2eNoReload?: boolean }).e2eNoReload),
        'the page was not reloaded',
      ).toBe(true);
    } finally {
      if (created) await api.deleteActivityIfExists(created.id);
      await cleanup(api, scene);
    }
  });
});

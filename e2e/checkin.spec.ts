import { Page } from '@playwright/test';
import { Activity, ApiHelper, Checkin, CheckinSchedule, Member } from './fixtures/api';
import { installFakeCamera } from './fixtures/fake-camera';
import { atLocalHour, LocalClock, localClock, pad } from './fixtures/clock';
import { fetchQrPayload, QrPayload, qrImageDataUrl } from './fixtures/qr';
import { expect, test } from './fixtures/test';

/*
 * The API uses its own clock as the check-in time (stem-acm/ACM-Backend#65): the
 * checkInTime that the browser sends is not used. The tests that scan a badge
 * therefore run on the real time of the test run. To get a known time of day, they
 * set the time zone of the app (Settings > General) to a fixed-offset zone such as
 * Etc/GMT-5, in which the real time is the hour they need (`atLocalHour`). The
 * browser clock is fixed at that same real instant, so the kiosk and the API see
 * the same time and the leaving-time picker shows known values. The chosen hours
 * stay away from the ends of the slots, so a test never crosses a slot boundary.
 *
 * The tests that never reach a time check of the API (closed screen, refused
 * badges, live activities) still fix the browser clock on their own date of
 * October 2026 (`eat`). The default schedule is: every day 08:00–12:00 and
 * 15:00–18:00, Saturday 09:00–16:00. `withSchedule` and `withTimezone` put the
 * stored values back at the end. Each test uses its own member, so the "one scan
 * per slot" rule never leaks between tests.
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
  /** Hour to choose in the hour picker (it can be the shown one). */
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
    // The parts and the options are scoped by class: the shown value and an option of
    // the picker can have the same number.
    const hourPart = page.locator('.time-part.hour');
    const minutePart = page.locator('.time-part.minute');
    await expect(hourPart).toHaveText(leaving.shown.hour);
    await expect(minutePart).toHaveText(leaving.shown.minute);
    const hour = leaving.hour ?? leaving.shown.hour;
    if (leaving.hour) {
      // The hour part pulses (CSS animation) until chosen, so it is never "stable".
      await hourPart.click({ force: true });
      await page.locator('.hour-picker').getByText(leaving.hour, { exact: true }).click();
    }
    // The minute part pulses too once the hour is chosen.
    await minutePart.click({ force: true });
    await page.locator('.minute-picker').getByText(leaving.minute, { exact: true }).click();
    await expect(hourPart).toHaveText(hour);
    await expect(minutePart).toHaveText(leaving.minute);
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

/**
 * Runs `run` with a changed check-in schedule, then stores the previous schedule
 * again. The tests run one at a time (one worker), so no other test sees the change.
 */
async function withSchedule(
  api: ApiHelper,
  change: (schedule: CheckinSchedule) => void,
  run: () => Promise<void>,
): Promise<void> {
  const original = await api.getCheckinSchedule();
  const changed = structuredClone(original);
  change(changed);
  await api.saveCheckinSchedule(changed);
  try {
    await run();
  } finally {
    await api.saveCheckinSchedule(original);
  }
}

/**
 * The leaving time that the picker shows first: now + 5 minutes, rounded up to the
 * next multiple of 5, or the next full hour after :55.
 */
function pickerDefault(clock: LocalClock): { hour: string; minute: string } {
  const next = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].find(m => m >= clock.minute + 5);
  return next === undefined
    ? { hour: pad(clock.hour + 1), minute: '00' }
    : { hour: pad(clock.hour), minute: pad(next) };
}

/** The same slots on every day of the week, so that the day of the run does not matter. */
function everyDay(slots: { start: string; end: string }[]) {
  return (schedule: CheckinSchedule) => {
    for (const day of Object.keys(schedule) as (keyof CheckinSchedule)[]) {
      schedule[day] = { open: true, slots: structuredClone(slots) };
    }
  };
}

const WEEKDAY_SLOTS = [
  { start: '08:00', end: '12:00' },
  { start: '15:00', end: '18:00' },
];

/** The check-in time is the API clock: between the start of the test step and now. */
function expectScannedSince(checkInTime: string, since: Date): void {
  const time = new Date(checkInTime).getTime();
  // A few seconds of margin for a clock difference between the API and the runner.
  expect(time).toBeGreaterThanOrEqual(since.getTime() - 5_000);
  expect(time).toBeLessThanOrEqual(Date.now() + 5_000);
}

/** The "Time zone: … · …" line of the closed screen. */
function openingHours(page: Page) {
  return page.locator('.closed-hours');
}

test.describe('F7 Check-in', () => {
  // A test stopped by its timeout cannot put the time zone back: start from the default.
  test.beforeEach(async ({ api }) => {
    if ((await api.getTimezone()) !== 'Indian/Antananarivo') {
      await api.saveTimezone('Indian/Antananarivo');
    }
  });

  test('F7.1 a valid badge on an allowed slot shows the welcome step and creates the check-in', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Welcome');
    try {
      await atLocalHour(api, 9, async clock => {
        await openCheckin(
          page,
          clock.now,
          await fetchQrPayload(api, scene.member.registrationNumber),
        );
        await chooseActivityAndScan(page, scene.activity);

        await expect(stepHeading(page, WELCOME)).toBeVisible();

        const checkins = await memberCheckins(api, scene.member);
        expect(checkins).toHaveLength(1);
        expect(checkins[0].registrationNumber).toBe(scene.member.registrationNumber);
        expect(checkins[0].activityId).toBe(scene.activity.id);
        expectScannedSince(checkins[0].checkInTime, clock.now);
      });
    } finally {
      await cleanup(api, scene);
    }
  });
  test('F7.2 a leaving time after the check-in time is stored as checkOutTime', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Leaving');
    try {
      await atLocalHour(api, 9, async clock => {
        await openCheckin(
          page,
          clock.now,
          await fetchQrPayload(api, scene.member.registrationNumber),
        );
        // At 09:mm the picker shows about 09:mm + 5; the leaving time is set to 11:30.
        await chooseActivityAndScan(page, scene.activity, {
          shown: pickerDefault(clock),
          hour: '11',
          minute: '30',
        });

        await expect(stepHeading(page, WELCOME)).toBeVisible();
        const checkins = await memberCheckins(api, scene.member);
        expect(checkins).toHaveLength(1);
        expectScannedSince(checkins[0].checkInTime, clock.now);
        expect(checkins[0].checkOutTime, 'stored checkOutTime').not.toBeNull();
        expect(new Date(checkins[0].checkOutTime as string).toISOString()).toBe(
          clock.at(11, 30).toISOString(),
        );
      });
    } finally {
      await cleanup(api, scene);
    }
  });
  test('F7.3 a leaving time before the check-in time is refused with an error and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Early');
    try {
      await atLocalHour(api, 9, async clock => {
        await openCheckin(
          page,
          clock.now,
          await fetchQrPayload(api, scene.member.registrationNumber),
        );
        const post = checkinPost(page);
        // At 09:mm the leaving time is set to 09:00, before the check-in time.
        await chooseActivityAndScan(page, scene.activity, {
          shown: pickerDefault(clock),
          hour: '09',
          minute: '00',
        });

        expect((await post).ok(), 'the API refuses the check-in').toBe(false);
        await expect
          .soft(toast(page), 'the refusal is shown')
          .toContainText(/check-out time must be after check-in time/i);
        await expect(stepHeading(page, WELCOME)).toHaveCount(0);
        expect(await memberCheckins(api, scene.member)).toHaveLength(0);
      });
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

  test('F7.7a the default schedule accepts a check-in at 10:xx on any day of the week', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Monday');
    try {
      // 10:xx is inside 08:00–12:00 and inside the Saturday 09:00–16:00.
      await atLocalHour(api, 10, async clock => {
        await openCheckin(
          page,
          clock.now,
          await fetchQrPayload(api, scene.member.registrationNumber),
        );
        await chooseActivityAndScan(page, scene.activity);

        await expect(stepHeading(page, WELCOME)).toBeVisible();
        const checkins = await memberCheckins(api, scene.member);
        expect(checkins).toHaveLength(1);
        expectScannedSince(checkins[0].checkInTime, clock.now);
      });
    } finally {
      await cleanup(api, scene);
    }
  });
  test('F7.7b on a Monday closed in Settings the check-in page shows the closed screen and creates nothing', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Mondayclosed');
    const at = eat('2026-10-05', '09:30'); // Monday
    try {
      await withSchedule(
        api,
        schedule => {
          schedule.monday = { open: false, slots: [] };
        },
        async () => {
          await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));

          await expectClosedScreen(page);
          await expect(openingHours(page)).not.toContainText('Monday');
          expect(await memberCheckins(api, scene.member)).toHaveLength(0);
        },
      );
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
      await expect(openingHours(page)).toContainText('Time zone: Indian/Antananarivo');
      await expect(openingHours(page)).toContainText('Monday–Friday: 08:00–12:00, 15:00–18:00');
      expect(await memberCheckins(api, scene.member)).toHaveLength(0);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.9 with the hours 09:00–16:00 a check-in at 10:xx is accepted and at 17:xx the closed screen is shown', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Saturday');
    try {
      await withSchedule(api, everyDay([{ start: '09:00', end: '16:00' }]), async () => {
        await atLocalHour(api, 10, async morning => {
          await openCheckin(
            page,
            morning.now,
            await fetchQrPayload(api, scene.member.registrationNumber),
          );
          await chooseActivityAndScan(page, scene.activity);
          await expect(stepHeading(page, WELCOME)).toBeVisible();
          const accepted = await memberCheckins(api, scene.member);
          expect(accepted).toHaveLength(1);
          expectScannedSince(accepted[0].checkInTime, morning.now);

          // Another time zone in which it is 17:xx now: after the slot.
          const evening = localClock(new Date(), 17);
          await api.saveTimezone(evening.zone);
          await page.clock.setFixedTime(evening.now);
          await page.goto('/checkin');

          await expectClosedScreen(page);
          expect(await memberCheckins(api, scene.member)).toHaveLength(1);
        });
      });
    } finally {
      await cleanup(api, scene);
    }
  });
  test('F7.10 a second scan of the same member in the same slot is refused as already scanned', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Twice');
    try {
      await atLocalHour(api, 9, async clock => {
        await openCheckin(
          page,
          clock.now,
          await fetchQrPayload(api, scene.member.registrationNumber),
        );
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
      });
    } finally {
      await cleanup(api, scene);
    }
  });
  test('F7.11 the same member on the same day in another slot is accepted twice', async ({
    page,
    api,
  }) => {
    // The second scan waits for the next minute of the real clock.
    test.setTimeout(150_000);
    const scene = await createScene(api, 'Halfdays');
    try {
      await atLocalHour(api, 9, async clock => {
        await openCheckin(
          page,
          clock.now,
          await fetchQrPayload(api, scene.member.registrationNumber),
        );
        await chooseActivityAndScan(page, scene.activity);
        await expect(stepHeading(page, WELCOME)).toBeVisible();
        await expect.poll(async () => (await memberCheckins(api, scene.member)).length).toBe(1);
        const [first] = await memberCheckins(api, scene.member);

        // A new slot starts at the minute after the first scan: the first scan stays in
        // the slot before it, and a scan from that minute on is in the new slot.
        const firstAt = clock.timeOf(new Date(first.checkInTime));
        const boundary = clock.at(firstAt.hour, firstAt.minute + 1);
        const next = firstAt.hour * 60 + firstAt.minute + 1;
        const startText = `${pad(Math.floor(next / 60))}:${pad(next % 60)}`;
        await withSchedule(
          api,
          everyDay([
            { start: '08:00', end: startText },
            { start: startText, end: '12:00' },
          ]),
          async () => {
            await expect
              .poll(() => Date.now(), { timeout: 70_000, intervals: [1_000] })
              .toBeGreaterThan(boundary.getTime() + 1_000);
            const secondAt = new Date();
            await page.clock.setFixedTime(secondAt);
            await page.reload();
            await chooseActivityAndScan(page, scene.activity);
            await expect(stepHeading(page, WELCOME)).toBeVisible();

            const checkins = await memberCheckins(api, scene.member);
            expect(checkins).toHaveLength(2);
            const times = checkins.map(c => c.checkInTime).sort();
            expect(times[0]).toBe(first.checkInTime);
            expectScannedSince(times[1], secondAt);
          },
        );
      });
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

  test('F7.13 the actual locally generated badge image is accepted by the check-in camera', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Localbadge');
    try {
      await page.goto('/cards');
      await page
        .getByRole('searchbox', { name: 'Search for members' })
        .fill(scene.member.lastName as string);
      await page.getByRole('button', { name: `View ${scene.member.lastName}'s badge` }).click();
      const image = page.getByRole('img', { name: 'QR Code' });
      await expect(image).toHaveAttribute('src', /^data:image\/png;base64,/);
      const dataUrl = (await image.getAttribute('src')) as string;

      await atLocalHour(api, 9, async clock => {
        await page.clock.setFixedTime(clock.now);
        await installFakeCamera(page, dataUrl, { motion: true });
        await page.goto('/checkin');
        await chooseActivityAndScan(page, scene.activity);
        await expect(stepHeading(page, WELCOME)).toBeVisible();
        const checkins = await memberCheckins(api, scene.member);
        expect(checkins).toHaveLength(1);
        expect(checkins[0].registrationNumber).toBe(scene.member.registrationNumber);
        expect(checkins[0].activityId).toBe(scene.activity.id);
      });
    } finally {
      await cleanup(api, scene);
    }
  });
  test('F7.14 with every day closed the check-in page says that no opening is scheduled', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Allclosed');
    const at = eat('2026-10-21', '09:00'); // Wednesday
    try {
      await withSchedule(
        api,
        schedule => {
          for (const day of Object.keys(schedule) as (keyof CheckinSchedule)[]) {
            schedule[day] = { open: false, slots: [] };
          }
        },
        async () => {
          await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));

          await expect(stepHeading(page, CLOSED)).toBeVisible();
          await expect(page.getByText('No opening is scheduled.')).toBeVisible();
          await expect(page.getByRole('timer')).toHaveCount(0);
          await expect(openingHours(page)).toHaveCount(0);
          await expect(stepHeading(page, CHOOSE_ACTIVITY)).toHaveCount(0);
          expect(await memberCheckins(api, scene.member)).toHaveLength(0);
        },
      );
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.15 the leaving time stops at the end of the open slot', async ({ page, api }) => {
    const scene = await createScene(api, 'Slotend');
    const at = eat('2026-10-22', '10:00'); // Thursday
    try {
      await withSchedule(
        api,
        schedule => {
          schedule.thursday = { open: true, slots: [{ start: '08:00', end: '10:30' }] };
        },
        async () => {
          await openCheckin(page, at, await fetchQrPayload(api, scene.member.registrationNumber));
          await activityTile(page, scene.activity).click();
          await expect(stepHeading(page, LEAVING_TIME)).toBeVisible();

          // At 10:00 the picker shows 10:05. The hour part pulses, so it is never "stable".
          await page.getByRole('button', { name: '10', exact: true }).click({ force: true });
          const hours = page.locator('.hour-picker .minute-option');
          await expect(hours).toHaveText(['10']);
          await hours.first().click();

          await page.getByRole('button', { name: '05', exact: true }).click({ force: true });
          const minutes = page.locator('.minute-picker .minute-option');
          await expect(minutes).toHaveText(['00', '05', '10', '15', '20', '25', '30']);
        },
      );
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F7.16 the kiosk, the leaving time and the API follow the time zone of the app, not the browser', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Utczone');
    try {
      const qr = await fetchQrPayload(api, scene.member.registrationNumber);
      // The same hours every day, so that the day of the run does not matter.
      await withSchedule(api, everyDay(WEEKDAY_SLOTS), async () => {
        // A zone in which it is 20:xx now: closed.
        await atLocalHour(api, 20, async night => {
          await openCheckin(page, night.now, qr);
          await expectClosedScreen(page);
        });

        // A zone in which it is 16:xx now: open (15:00–18:00). The browser stays in EAT.
        await atLocalHour(api, 16, async clock => {
          expect((await api.getKioskSchedule()).timezone).toBe(clock.zone);
          await page.clock.setFixedTime(clock.now);
          await page.goto('/checkin');
          await expect(stepHeading(page, CLOSED)).toHaveCount(0);

          // The picker starts at 16:mm + 5 in the zone of the app; 17:45 is stored as
          // 17:45 in that zone.
          await chooseActivityAndScan(page, scene.activity, {
            shown: pickerDefault(clock),
            hour: '17',
            minute: '45',
          });
          await expect(stepHeading(page, WELCOME)).toBeVisible();
          const checkins = await memberCheckins(api, scene.member);
          expect(checkins).toHaveLength(1);
          expectScannedSince(checkins[0].checkInTime, clock.now);
          expect(new Date(checkins[0].checkOutTime as string).toISOString()).toBe(
            clock.at(17, 45).toISOString(),
          );
        });

        // A zone in which it is 13:xx now: between the slots; the next one starts at 15:00.
        await atLocalHour(api, 13, async noon => {
          await page.clock.setFixedTime(noon.now);
          await page.goto('/checkin');
          await expectClosedScreen(page);
          // The kiosk counts the seconds from its fixed clock to 15:00.
          const seconds = Math.ceil((noon.at(15, 0).getTime() - noon.now.getTime()) / 1000);
          const countdown = [
            Math.floor(seconds / 3600),
            Math.floor((seconds % 3600) / 60),
            seconds % 60,
          ]
            .map(pad)
            .join(':');
          await expect(page.getByRole('timer', { name: 'Time until opening' })).toHaveText(
            countdown,
          );
          await expect(openingHours(page)).toContainText(`Time zone: ${noon.zone}`);
        });
      });
      expect(await api.getTimezone()).toBe('Indian/Antananarivo');
    } finally {
      await cleanup(api, scene);
    }
  });
});

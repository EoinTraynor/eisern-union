/* eslint-disable no-console */
import * as path from 'path';
import { chromium } from 'playwright';
import { sendTelegramNotification } from './notifier';

const matchUrl =
  'https://tickets.union-zeughaus.de/unveu/1.-fc-union-berlin-sv-werder-bremen_4.htm';
const baseUrl = 'https://tickets.union-zeughaus.de';
const userDataDir = path.join(__dirname, '../user_data');

const getRandomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

async function startZweitmarktSniper() {
  // eslint-disable-next-line no-console
  console.log('🦅 Eisern Union Zweitmarkt Sniper Active...');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 720 },
  });

  const page = context.pages()[0] || (await context.newPage());

  // 1. Initial Login Check
  await page.goto(`${baseUrl}/unveu/profis-maenner.htm`);
  if (await page.locator('a[href*="RedirectToSso=1"]').first().isVisible()) {
    // eslint-disable-next-line no-console
    console.log('🚨 Login required...');
    await page.goto(`${baseUrl}/unveu/data?RedirectToSso=1`);
    await page.waitForURL(/tickets\.union-zeughaus\.de\/unveu/, { timeout: 0 });
  }

  let ticketInBasket = false;
  // const venueDataUrl = 'https://tickets.union-zeughaus.de/unveu/SynwayVenue/VenueData/Veranstaltungen/52370706-591c-4cde-98a7-527d0b0f370f';

  // 1. First, navigate once to the page to initialize the venue object
  await page.goto(matchUrl, { waitUntil: 'domcontentloaded' });

  while (!ticketInBasket) {
    // eslint-disable-next-line no-console
    console.log(`[${new Date().toLocaleTimeString()}] ⚡ Turbo Polling API...`);

    // Combine your variables into a single object
    const options = {
      apiUrl:
        'https://tickets.union-zeughaus.de/unveu/SynwayVenue/VenueData/Veranstaltungen/52370706-591c-4cde-98a7-527d0b0f370f',
      targetSektors: ['SEKTOR 2', 'SEKTOR 3', 'SEKTOR 4'],
    };

    const result = await page.evaluate(async ({ apiUrl, targetSektors }) => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data?.Blocks) return { status: 'retry', msg: 'No data' };

        interface Block {
          Stand: string;
          CurrentResellingId: string | null;
          ID: string;
          FullName: string;
        }

        // Sniper logic using targetSektors from our wrapped object
        const target = data.Blocks.find((b: Block) => {
          const isTargetSektor = targetSektors.includes(b.Stand?.toUpperCase());
          const hasResale = b.CurrentResellingId !== null;
          return isTargetSektor && hasResale;
        });

        if (!target) return { status: 'retry', msg: 'Zweitmarkt empty' };

        // Attempt booking
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          return { status: 'retry', msg: 'Canvas not found' };
        }
        const jQueryKey = Object.keys(canvas).find((k) =>
          k.startsWith('jQuery')
        );
        if (!jQueryKey) {
          return { status: 'retry', msg: 'jQuery key not found on canvas' };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { venue } = (canvas as any)[jQueryKey];

        const bookResponse = await venue.BookTicket({
          Count: 1,
          BlockID: target.ID,
          ResellingID: target.CurrentResellingId,
          ZD: '',
          id: venue.VID,
          SubName: venue.SubName,
        });

        return {
          status: 'success',
          block: target.FullName,
          response: bookResponse,
        };
      } catch (e) {
        if (e instanceof Error) {
          return { status: 'error', msg: e.message };
        }
        return { status: 'error', msg: 'An unknown error occurred' };
      }
    }, options);

    if (result.status === 'success') {
      // Check if the server actually gave us the ticket
      if (result.response && result.response.error) {
        // eslint-disable-next-line no-console
        console.log(`❌ FAIL: ${result.response.error}`); // "Someone was faster"
      } else {
        // eslint-disable-next-line no-console
        console.log(`🎯 BOOM! Carted ${result.block}!`);
        ticketInBasket = true;
        await sendTelegramNotification(
          `🎯 *TURBO HIT!*\n${result.block} secured!`
        );
        process.stdout.write('\x07');
      }
    }

    // Extremely short randomized jitter for Turbo Mode
    await page.waitForTimeout(getRandomDelay(500, 1500));

    // Auto-dismiss any "Faster than you" modals if they pop up
    const modal = page.locator('.modal-dialog');
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
    }
  }

  await page.goto(`${baseUrl}/unveu/ShoppingCart`);
  // eslint-disable-next-line no-console
  console.log('🚨 FINISH CHECKOUT MANUALLY NOW! 🚨');
}

// eslint-disable-next-line no-console
startZweitmarktSniper().catch(console.error);

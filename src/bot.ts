import * as path from 'path';
import { chromium } from 'playwright';
import { sendTelegramNotification } from './notifier';

const matchUrl = 'https://tickets.union-zeughaus.de/unveu/1.-fc-union-berlin-sv-werder-bremen_4.htm';
const baseUrl = 'https://tickets.union-zeughaus.de';
// Define a folder to store your browser profile
const userDataDir = path.join(__dirname, '../user_data');

/**
 * Generates a random delay between a min and max value.
 * @param min Minimum milliseconds
 * @param max Maximum milliseconds
 */
const getRandomDelay = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1) + min);

async function startBot() {
    console.log("🦅 Eisern Union Sniper Bot: Persistent Session Mode");

    // Launch with a persistent data directory
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 720 }
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // 1. Check Login State
    await page.goto(`${baseUrl}/unveu/profis-maenner.htm`);

    // Check if we see a 'Login' link or the 'Logout' link
    const isLoggedOut = await page.locator('a[href*="RedirectToSso=1"]').first().isVisible();

    if (isLoggedOut) {
        console.log("🚨 Session expired or not found. Please log in manually ONCE...");
        await page.goto(`${baseUrl}/unveu/data?RedirectToSso=1`);
        // The bot will wait here until you successfully log in and the URL changes
        await page.waitForURL(/tickets\.union-zeughaus\.de\/unveu/, { timeout: 0 });
        console.log("✅ Login successful and saved to user_data folder!");
    } else {
        console.log("🚀 Existing session found! Skipping login...");
    }

    let ticketInBasket = false;
    let attemptCount = 0;

    while (!ticketInBasket) {
        attemptCount++;
        // Generate a fresh random delay for THIS specific cycle
        const currentDelay = getRandomDelay(6000, 12000);

        console.log(`\n--- [Attempt #${attemptCount}] ${new Date().toLocaleTimeString()} ---`);

        try {
            await page.goto(matchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const result = await Promise.race([
                page.waitForSelector('canvas', { timeout: 5000 }).then(() => 'LIVE'),
                page.waitForSelector('.event-status-container', { timeout: 5000 }).then(() => 'WAIT')
            ]);

            if (result === 'WAIT') {
                console.log(`ℹ️ STATUS: Tickets not live. Human-like pause: ${(currentDelay / 1000).toFixed(1)}s`);
                await page.waitForTimeout(currentDelay);
                continue;
            }

            console.log("🚀 ALERT: CANVAS DETECTED!");

            const success = await page.evaluate(async () => {
                const canvas = document.querySelector("canvas");
                // @ts-expect-error accessing DOM internals
                const jQueryKey = Object.keys(canvas).find(k => k.startsWith("jQuery"));
                if (!jQueryKey) return { status: 'error', message: 'jQuery not found' };

                // @ts-expect-error accessing DOM internals
                const { venue } = canvas[jQueryKey];
                if (!venue?.Venue?.Blocks) return { status: 'loading', message: 'Data loading...' };

                const bookableBlocks = venue.Venue.Blocks.filter((b: any) => {
                    // Filter logic derived from venue-data.json
                    return !b.Blocked &&
                           parseInt(b.FreeCapacity || "0") > 0 &&
                           ["SEKTOR 2", "SEKTOR 3", "SEKTOR 4"].includes(b.Stand?.toUpperCase());
                });

                if (bookableBlocks.length === 0) return { status: 'empty', message: 'No targets available' };

                const target = bookableBlocks[0];
                await venue.BookTicket({
                    "Count": 1,
                    "BlockID": target.ID,
                    "ResellingID": target.CurrentResellingId,
                    "ZD": "",
                    "id": venue.VID,
                    "SubName": venue.SubName,
                });
                return { status: 'success', message: `Carted ${target.FullName}` };
            });

            if (success.status === 'success') {
                console.log(`✅ ${success.message}`);
                ticketInBasket = true;

                // Send the alert to your phone!
                await sendTelegramNotification(
                    `🎯 *Eisern Bot Success!*\n` +
                    `🎟️ Ticket secured: ${success.message}\n` +
                    `🛒 [Click here to Checkout](${baseUrl}/unveu/ShoppingCart)`
                );
            } else {
                console.log(`Label: ${success.message}. Randomizing next retry...`);
                await page.waitForTimeout(currentDelay);
            }

        } catch (error) {
            const errorMsg = error.message.split('\n')[0];
            console.error(`⚠️ NETWORK ERROR: ${errorMsg}`);
            // Add jitter to the error cooldown too
            const errorCooldown = getRandomDelay(10000, 15000);
            console.log(`Cooling down for ${(errorCooldown / 1000).toFixed(1)}s...`);
            await page.waitForTimeout(errorCooldown);
        }
    }

    // 4. Success
    process.stdout.write('\x07');
    await page.goto(`${baseUrl}/unveu/ShoppingCart`);
    console.log("🚨 CHECKOUT NOW! 🚨");
}

startBot().catch(console.error);

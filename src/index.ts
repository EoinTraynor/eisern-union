/* eslint-disable @typescript-eslint/no-unused-vars */
import * as puppeteer from "puppeteer";

const initBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
  });
  return browser;
};

const username = process.env.EMAIL;
const password = process.env.PASSWORD;
const baseUrl = 'https://tickets.union-zeughaus.de';
const matchUrlPath = 'Veranstaltungen/e51be730-d9cb-4ff7-a1e9-29c3203a2f20';
// const matchId = '534be454-f064-42f4-a434-8530d8ad4a48';

declare global {
  interface Window {
    Synway: {
      BaseUrl: () => string;
      CurrentSub: string;
      SynwayInitialized: boolean;
    };
    $0: {
      jQuery3700413672318284486142: {
        src: string;
        venue: object,

      }
    };
    $_: {
      jQuery3700413672318284486142: {
        src: string;
        venue: object,

      }
    }
  }
}

type AvailableTicket = {
  BlockID: string;
  BlockName: string;
  BlockStatus: string;
  Pricelist: PriceListItem[];
  MinPrice: number;
  MaxPrice: number;
}

type PriceListItem = {
  SeatType: object;
  MinPrice: number;
  MaxPrice: number;
  Prices: Price[];
}

type Price = {
  id: string;
  Price: number;
  Ticket: string;
  SellingHint: string;
}

const login = async (page: puppeteer.Page) => {
  if (!password || !username) return Error('No username or password found');
  await page.goto("https://anmeldung.fc-union-berlin.de/auth/realms/union/protocol/openid-connect/auth?client_id=union-tickets&scope=openid+lms_id&redirect_uri=https%3a%2f%2ftickets.union-zeughaus.de%2funveu%2fSynwayLoginSso%2fLoginCallback%2fAnmeldung&response_type=code");
  await page.type("#username", username);
  await page.type("#password", password);
  await page.click('.form__submit-button');
  await page.waitForNavigation();
};

const navigateToGame = async (page: puppeteer.Page) => {
  await page.goto(`${baseUrl}/unveu/venue/${matchUrlPath}`, { waitUntil: 'domcontentloaded' });
  if (await page.waitForSelector('#CybotCookiebotDialogBodyButtonDecline')) {
    await page.click('#CybotCookiebotDialogBodyButtonDecline');
  }
}

const isLoggedIn = async (page: puppeteer.Page) => {
  try {
    await page.waitForSelector(`[href='SynwayLoginSso/Logout/Anmeldung']`)
    return true;
  } catch (error) {
    return false;
  }
}

(async () => {
  const browser = await initBrowser();
  const page = await browser.newPage();

  // await login(page)
  // if (await isLoggedIn(page)) {
  //
  // }
    const availableTickets: AvailableTicket[] = [];
    page.on('response', async response => {
      const url = await response.url();
      if (url.startsWith('https://tickets.union-zeughaus.de/unveu/SynwayVenue/Prices/Veranstaltungen')) {
        const json = await response.json();
        const jsonData: AvailableTicket = json.data;
        const isSeatedSection = () => jsonData.BlockName === null;
        const isAwaySection = () => jsonData.BlockName.includes('SEKTOR 5');
        if (!isSeatedSection() && !isAwaySection()) {
          availableTickets.push(jsonData);
        }
      }
    });

    await navigateToGame(page);

    await page.waitForFunction(`
      Object.keys(
        document.querySelector("canvas")
      ).some(k => k.startsWith("jQuery"))
    `);

    const data = await page.$eval("canvas", async el => {
      const jQuery =
      // @ts-expect-error fsaldj
        Object.entries(el).find(([k, v]) => {
          return k.startsWith("jQuery")
        }
        )[1];
      const { venue } = jQuery;
      const { SubName, VID, BookTicket } = venue;
      const { Blocks = [] } = venue.Venue;
      const bookableBlocks = Blocks.filter((block: {Blocked: boolean }) => block.Blocked === false);
      // Background color may indicate if it's possible to purchase a ticket in that block.
      const { CurrentResellingId, ID, BackgroundColor, FullName, ShortName} = bookableBlocks[0];
      const payload = {
        "Count": 1,
        "BlockID": ID, // BlockID
        "ResellingID": CurrentResellingId,
        "ZD": "",
        "id": VID, // MatchID
        "SubName": SubName,
      }
      await jQuery.venue.BookTicket(payload)

      return { payload, BookTicket: jQuery.venue.BookTicket };
    });

    console.log(data);

    await browser.close();
})();

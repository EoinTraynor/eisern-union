/* eslint-disable @typescript-eslint/no-unused-vars */
import * as puppeteer from "puppeteer";

const initBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    devtools: true,
  });
  return browser;
};

const username = process.env.EMAIL;
const password = process.env.PASSWORD;
const baseUrl = 'https://tickets.union-zeughaus.de';
const matchUrlPath = 'Veranstaltungen2/4312d7e8-7a69-4982-b6fb-29e315ef1fd5';
// const matchUrlPath = 'Veranstaltungen/e51be730-d9cb-4ff7-a1e9-29c3203a2f20';

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
  await page.goto(`${baseUrl}/unveu/data?RedirectToSso=1`);
  await page.type("#username", username);
  await page.type("#password", password);
  await page.click('.form__submit-button');
  // await page.waitForNavigation();
};

const declineCookies = async (page: puppeteer.Page) => {
  if (await page.waitForSelector('#CybotCookiebotDialogBodyButtonDecline')) {
    await page.click('#CybotCookiebotDialogBodyButtonDecline');
  }
}

const navigateToGame = async (page: puppeteer.Page) => {
  await page.goto(`${baseUrl}/unveu/venue/${matchUrlPath}`, { waitUntil: 'domcontentloaded' });
}

const isLoggedIn = async (page: puppeteer.Page) => {
  try {
    await page.waitForSelector(`[href='SynwayLoginSso/Logout/Anmeldung']`)
    return true;
  } catch (error) {
    return false;
  }
}

const attemptTpBook = async (page: puppeteer.Page) => {
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
    // return Blocks;
    const suitableBlocks = ["SEKTOR 2", "SEKTOR 3", "SEKTOR 4"]
    const bookableBlocks = Blocks.filter((block: {Blocked: boolean, Stand: string }) => block.Blocked === false && suitableBlocks.includes(block.Stand));
    // const bookableBlocks = bookableBlockss.slice(8);
    // Background color may indicate if it's possible to purchase a ticket in that block.
    for (let block = 0; block < bookableBlocks.length; block++) {
      const { CurrentResellingId, ID, BackgroundColor, FullName, ShortName } = bookableBlocks[block];
      const payload = {
        "Count": 1,
        "BlockID": ID, // BlockID
        "ResellingID": CurrentResellingId,
        "ZD": "",
        "id": VID, // MatchID
        "SubName": SubName,
      }
      await jQuery.venue.BookTicket(payload)
    }

    return bookableBlocks;
  });
  return data;
}

(async () => {
  const browser = await initBrowser();
  const page = await browser.newPage();

  await login(page);
  await declineCookies(page);
  await navigateToGame(page);

  const isCanvasPresent = await page.waitForSelector('canvas');
  if (!isCanvasPresent) {
    console.log('reload');
    page.reload();
  }

  const data = await attemptTpBook(page);
  console.log({data});

    if (!data.length) {
      await page.reload({ waitUntil: "networkidle2"});
      await page.waitForSelector('booooo');
    }

    // await page.reload({ waitUntil: "networkidle2"});

    // if (await page.waitForSelector('#jsShoppingCartButtonCount')) {
    //   await page.click('#jsShoppingCartButtonCount');
    // }

    // if (await page.waitForSelector('.jsVenueShoppingCart')) {
    //   const shoppingCartTickets = await page.$$('.shoppingcart-item-ticket');
    //   console.log(shoppingCartTickets);

    // }

    // await page.waitForSelector('#CybotCookiebotDialogBodyButtonDeclinefdasf');
    await browser.close();
})();

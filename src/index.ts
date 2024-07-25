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
const matchUrlPath = '1.-fc-union-berlin-glasgow-rangers.htm'

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
  console.log('navigateToGame');
  await page.goto(`${baseUrl}/unveu/${matchUrlPath}`);
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

const purchaseTicket = async (page: puppeteer.Page, availableTickets: AvailableTicket[]) => {
  console.log('purchaseTicket');
  console.log(availableTickets);

  const info = availableTickets[0];

  await page.evaluate(async (info) => {

    const myHeaders = new Headers({
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Brave\";v=\"126\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Linux\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
      "x-requested-with": "XMLHttpRequest",
      "Referer": "https://tickets.union-zeughaus.de/unveu/1.-fc-union-berlin-glasgow-rangers.htm?langid=1",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    // TODO: Replace MatchID
    const matchId = '114a1a9d-baa4-47c3-9157-782222e5536e';
    const response = await fetch(`https://tickets.union-zeughaus.de/unveu/SynwayVenue/BookTicket/Veranstaltungen2/${matchId}`, {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify({
        "Count": 1,
        "BlockID": info.BlockID,
        "ResellingID": '',
        "ZD": '',
        "id": matchId,
        "SubName": 'Veranstaltungen',
      })
    });
    const text = await response.text();
    console.log({text});
    return text;
  }, info);
}

const createRequest = () => {}

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
      if (url.startsWith('https://tickets.union-zeughaus.de/unveu/SynwayVenue/Prices/Veranstaltungen/')) {
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
    await purchaseTicket(page, availableTickets);
    await browser.close();
})();

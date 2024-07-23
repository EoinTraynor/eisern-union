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

const login = async (page: puppeteer.Page) => {
  if (!password || !username) return Error('No username or password found');
  await page.goto("https://anmeldung.fc-union-berlin.de/auth/realms/union/protocol/openid-connect/auth?client_id=union-tickets&scope=openid+lms_id&redirect_uri=https%3a%2f%2ftickets.union-zeughaus.de%2funveu%2fSynwayLoginSso%2fLoginCallback%2fAnmeldung&response_type=code");
  await page.type("#username", username);
  await page.type("#password", password);
  await page.click('.form__submit-button');
  await page.waitForNavigation();
};

const navigateToGame = async (page: puppeteer.Page) => {
  await page.goto(`${baseUrl}/unveu/${matchUrlPath}`);
  if (await page.waitForSelector('#CybotCookiebotDialogBodyButtonDecline')) {
    await page.click('#CybotCookiebotDialogBodyButtonDecline');
  }
  await page.waitForNavigation();
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

  await login(page);

  if (await isLoggedIn(page)) {

    await page.setRequestInterception(true);
    // page.on('request', async request => {
    //   const url = request.url();
    //   if (url.startsWith('https://tickets.union-zeughaus.de/unveu/SynwayVenue/Prices/Veranstaltungen/')) {
    //     const response = await request.response();
    //     console.log(response);
    //   }
    //   request.continue();
    // })

    // page.on('requestfinished', async (request) => {
    //   if (request.url().includes('unveu/SynwayVenue/Prices/Veranstaltungen')){
    //     const response = await request.response();
    //     if (response) {
    //       const headers = response.headers();
    //       console.log({headers});
    //     }
    //   }
    //   request.continue()
    // });

    // page.on('response', response => {
    //   const url = response.url();
    //   console.log(url);
    //   if (url.startsWith('https://tickets.union-zeughaus.de/unveu/SynwayVenue/Prices/Veranstaltungen/')) {
    //     const headers = response.headers();
    //     const json = response.json();
    //     const postData = response.request().postData();
    //     console.log({url, headers, json, postData});
    //   }
    // });

    await navigateToGame(page);
  }
  await browser.close();
})();

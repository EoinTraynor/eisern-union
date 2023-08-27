import * as puppeteer from "puppeteer";

const initBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
  });
  return browser;
};

const username = '';
const password = '';

const login = async (page: puppeteer.Page) => {
  await page.goto("https://anmeldung.fc-union-berlin.de/auth/realms/union/protocol/openid-connect/auth?client_id=union-tickets&scope=openid+lms_id&redirect_uri=https%3a%2f%2ftickets.union-zeughaus.de%2funveu%2fSynwayLoginSso%2fLoginCallback%2fAnmeldung&response_type=code");
  await page.type("#username", username);
  await page.type("#password", password);
  await page.click('.form__submit-button');
  await page.waitForNavigation();
};

const navigateToGame = async (page: puppeteer.Page) => {
  await page.goto('https://tickets.union-zeughaus.de/unveu/1.-fc-union-berlin-rasenballsport-leipzig.htm');
  await page.click('#CybotCookiebotDialogBodyButtonDecline');
  await page.waitForNavigation();
}

(async () => {
  const browser = await initBrowser();
  const page = await browser.newPage();
  await login(page);
  await navigateToGame(page);
  await browser.close();
})();

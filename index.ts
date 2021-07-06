import * as puppeteer from 'puppeteer';
import { Page } from "puppeteer";

const usedLinks = [];
const currentLink = new URL(process.argv[2]);
const urlsWithStatuses: {
  url?: string;
  statusCode?: number;
}[] = [];

async function run() {
  try {
    const browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    const override = Object.assign(page.viewport(), { width: 1920 });

    await page.setViewport(override);

    await page.goto(currentLink.href);

    const links = await getLinks(page);

    await getPageLinksRecursive(links, page);

    console.log(urlsWithStatuses, 'all urls with statuses');

    const result = urlsWithStatuses.reduce((c, { statusCode: key }) => (c[key] = (c[key] || 0) + 1, c), {});

    await browser.close();
    return result;
  } catch (error) {
    console.log(error);
  }
}

async function getLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const elements = document.querySelectorAll(
        'a',
    ) as NodeListOf<HTMLAnchorElement>;

    return Array.from(elements).map(element => element.href);
  });
}

async function getPageLinksRecursive(links: string[], page: Page) {
  for (let link of links) {
    const url = new URL(link);
    if (usedLinks?.includes(link) || url.hostname !== currentLink.hostname) {
      continue;
    }

    const response = await page.goto(link);

    urlsWithStatuses.push({
      url: link,
      statusCode: response?.status(),
    });

    const separatePageLinks = await getLinks(page);

    usedLinks.push(url.href);
    if (separatePageLinks.length > 0) {
      await getPageLinksRecursive(separatePageLinks, page);
    }
  }
}

run()
    .then(result => {
      console.log(result, 'total number of URLs by status code');
    }).catch(error => {
  console.log(error, '===error');
})

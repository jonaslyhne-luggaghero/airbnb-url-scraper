import { Actor } from 'apify';
import { PlaywrightCrawler } from '@crawlee/playwright';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const city = input.city ?? 'Copenhagen';
const maxPages = input.maxPages ?? 10;

const CITIES = {
    'Copenhagen':   { ne_lat: 55.730, ne_lng: 12.660, sw_lat: 55.630, sw_lng: 12.490 },
    'Paris':        { ne_lat: 48.950, ne_lng: 2.470,  sw_lat: 48.790, sw_lng: 2.220  },
    'Amsterdam':    { ne_lat: 52.420, ne_lng: 4.970,  sw_lat: 52.330, sw_lng: 4.840  },
    'Berlin':       { ne_lat: 52.570, ne_lng: 13.480, sw_lat: 52.460, sw_lng: 13.320 },
    'Barcelona':    { ne_lat: 41.430, ne_lng: 2.230,  sw_lat: 41.340, sw_lng: 2.110  },
    'Madrid':       { ne_lat: 40.460, ne_lng: -3.640, sw_lat: 40.370, sw_lng: -3.760 },
    'Rome':         { ne_lat: 41.950, ne_lng: 12.550, sw_lat: 41.840, sw_lng: 12.420 },
    'Vienna':       { ne_lat: 48.260, ne_lng: 16.430, sw_lat: 48.160, sw_lng: 16.290 },
    'Prague':       { ne_lat: 50.130, ne_lng: 14.500, sw_lat: 50.030, sw_lng: 14.360 },
    'Lisbon':       { ne_lat: 38.780, ne_lng: -9.090, sw_lat: 38.680, sw_lng: -9.210 },
    'Brussels':     { ne_lat: 50.900, ne_lng: 4.430,  sw_lat: 50.800, sw_lng: 4.310  },
    'Stockholm':    { ne_lat: 59.380, ne_lng: 18.130, sw_lat: 59.290, sw_lng: 17.980 },
    'Oslo':         { ne_lat: 59.960, ne_lng: 10.810, sw_lat: 59.870, sw_lng: 10.680 },
    'Helsinki':     { ne_lat: 60.220, ne_lng: 25.060, sw_lat: 60.130, sw_lng: 24.890 },
    'Munich':       { ne_lat: 48.190, ne_lng: 11.640, sw_lat: 48.090, sw_lng: 11.480 },
    'Hamburg':      { ne_lat: 53.610, ne_lng: 10.070, sw_lat: 53.510, sw_lng: 9.910  },
    'Warsaw':       { ne_lat: 52.290, ne_lng: 21.080, sw_lat: 52.180, sw_lng: 20.930 },
    'Budapest':     { ne_lat: 47.560, ne_lng: 19.120, sw_lat: 47.450, sw_lng: 18.970 },
    'Athens':       { ne_lat: 38.020, ne_lng: 23.800, sw_lat: 37.920, sw_lng: 23.670 },
    'Milan':        { ne_lat: 45.520, ne_lng: 9.270,  sw_lat: 45.420, sw_lng: 9.120  },
    'Zurich':       { ne_lat: 47.430, ne_lng: 8.610,  sw_lat: 47.330, sw_lng: 8.480  },
    'Dublin':       { ne_lat: 53.390, ne_lng: -6.190, sw_lat: 53.300, sw_lng: -6.320 },
    'Edinburgh':    { ne_lat: 56.000, ne_lng: -3.120, sw_lat: 55.900, sw_lng: -3.260 },
    'Krakow':       { ne_lat: 50.110, ne_lng: 20.010, sw_lat: 50.010, sw_lng: 19.870 },
    'Lyon':         { ne_lat: 45.810, ne_lng: 4.910,  sw_lat: 45.710, sw_lng: 4.780  },
    'Zagreb':       { ne_lat: 45.870, ne_lng: 16.060, sw_lat: 45.770, sw_lng: 15.920 },
    'Ljubljana':    { ne_lat: 46.110, ne_lng: 14.570, sw_lat: 46.010, sw_lng: 14.430 },
    'Riga':         { ne_lat: 57.000, ne_lng: 24.180, sw_lat: 56.900, sw_lng: 24.040 },
    'Tallinn':      { ne_lat: 59.490, ne_lng: 24.820, sw_lat: 59.390, sw_lng: 24.680 },
    'Vilnius':      { ne_lat: 54.740, ne_lng: 25.350, sw_lat: 54.640, sw_lng: 25.210 },
};

const CITY_URLS = {
    'Copenhagen':  'Copenhagen--Denmark',
    'Paris':       'Paris--France',
    'Amsterdam':   'Amsterdam--Netherlands',
    'Berlin':      'Berlin--Germany',
    'Barcelona':   'Barcelona--Spain',
    'Madrid':      'Madrid--Spain',
    'Rome':        'Rome--Italy',
    'Vienna':      'Vienna--Austria',
    'Prague':      'Prague--Czech-Republic',
    'Lisbon':      'Lisbon--Portugal',
    'Brussels':    'Brussels--Belgium',
    'Stockholm':   'Stockholm--Sweden',
    'Oslo':        'Oslo--Norway',
    'Helsinki':    'Helsinki--Finland',
    'Munich':      'Munich--Germany',
    'Hamburg':     'Hamburg--Germany',
    'Warsaw':      'Warsaw--Poland',
    'Budapest':    'Budapest--Hungary',
    'Athens':      'Athens--Greece',
    'Milan':       'Milan--Italy',
    'Zurich':      'Zurich--Switzerland',
    'Dublin':      'Dublin--Ireland',
    'Edinburgh':   'Edinburgh--United-Kingdom',
    'Krakow':      'Krakow--Poland',
    'Lyon':        'Lyon--France',
    'Zagreb':      'Zagreb--Croatia',
    'Ljubljana':   'Ljubljana--Slovenia',
    'Riga':        'Riga--Latvia',
    'Tallinn':     'Tallinn--Estonia',
    'Vilnius':     'Vilnius--Lithuania',
};

const coords = CITIES[city] || CITIES['Copenhagen'];
const citySlug = CITY_URLS[city] || encodeURIComponent(city);
const startUrl = `https://www.airbnb.com/s/${citySlug}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=12`;

console.log(`Searching ${city} for business hosts (max ${maxPages} pages)...`);

const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: 'DE', // German proxies — more reliable than FR
});

const seenUrls = new Set();
const seenCompanies = new Set();

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    headless: true,
    navigationTimeoutSecs: 90,
    requestHandlerTimeoutSecs: 1800,
    maxConcurrency: 1,
    maxRequestRetries: 2,
    launchContext: {
        launchOptions: {
            args: ['--disable-gpu', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
        },
    },
    requestHandler: async ({ page }) => {
        let pageNum = 0;

        while (pageNum < maxPages) {
            pageNum++;
            console.log(`\n--- Page ${pageNum} ---`);
            console.log(`  URL: ${page.url().substring(0, 150)}`);

            // Wait for listing cards to render
            await page.waitForSelector('a[href*="/rooms/"]', { timeout: 30000 }).catch(() => {});
            await sleep(8000);

            // Find all "Business host" listing URLs on this page
            const businessListingUrls = await page.evaluate(() => {
                const results = [];
                const allEls = [...document.querySelectorAll('*')];
                for (const el of allEls) {
                    if (el.childNodes.length <= 3 && el.textContent?.trim() === 'Business host') {
                        let parent = el.parentElement;
                        for (let i = 0; i < 15; i++) {
                            if (!parent) break;
                            const link = parent.querySelector('a[href*="/rooms/"]');
                            if (link) {
                                const href = link.getAttribute('href');
                                const url = href.startsWith('http') ? href : `https://www.airbnb.com${href}`;
                                results.push(url.split('?')[0]);
                                break;
                            }
                            parent = parent.parentElement;
                        }
                    }
                }
                return [...new Set(results)];
            });

            const newUrls = businessListingUrls.filter(u => !seenUrls.has(u));
            console.log(`  Found ${businessListingUrls.length} business hosts, ${newUrls.length} new`);

            if (newUrls.length === 0 && pageNum > 2) {
                console.log('  No new business hosts — stopping.');
                break;
            }

            // Open each listing in a new tab — search page stays open
            for (const listingUrl of newUrls) {
                seenUrls.add(listingUrl);
                console.log(`  Processing: ${listingUrl}`);

                const context = page.context();
                const tab = await context.newPage();

                try {
                    const domain = page.url().match(/https:\/\/[^\/]+/)?.[0] || 'https://www.airbnb.com';
                    const modalUrl = `${domain}/rooms/${listingUrl.split('/rooms/')[1]}?modal=PROFESSIONAL_HOST_DETAILS`;
                    
                    let loaded = false;
                    try {
                        await tab.goto(modalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                        loaded = true;
                    } catch (e) {
                        console.log(`    ⚡ Page load timeout — skipping`);
                    }

                    if (!loaded) { await tab.close(); continue; }

                    await tab.waitForSelector('[role="dialog"], [data-testid="modal-container"]', { timeout: 10000 }).catch(() => {});
                    await sleep(2000);

                    // Debug: log what we actually got
                    const tabUrl = tab.url();
                    const bodyText = await tab.evaluate(() => document.body.innerText?.substring(0, 200) || '');
                    console.log(`    URL: ${tabUrl.substring(0, 80)}`);
                    console.log(`    Body: ${bodyText.substring(0, 100)}`);

                    const tabTitle = await tab.title();
                    console.log(`    Tab: ${tabTitle.substring(0, 60)}`);

                    let modalText = '';
                    const selectors = ['[role="dialog"]', '[data-testid="modal-container"]', '[aria-modal="true"]'];
                    for (const sel of selectors) {
                        try {
                            const el = await tab.$(sel);
                            if (el) {
                                modalText = await tab.evaluate(el => el.innerText || '', el);
                                if (modalText.length > 50) break;
                            }
                        } catch (e) {}
                    }
                    if (!modalText || modalText.length < 50) {
                        modalText = await tab.evaluate(() => document.body.innerText || '');
                    }

                    let companyName = null, email = null, phone = null, address = null, registrationNumber = null;
                    const lines = modalText.split('\n').map(l => l.trim()).filter(Boolean);
                    for (const line of lines) {
                        const colonIdx = line.indexOf(':');
                        if (colonIdx === -1) continue;
                        const label = line.substring(0, colonIdx).trim().toLowerCase();
                        const value = line.substring(colonIdx + 1).trim();
                        if (!value) continue;
                        if (label.includes('business name') || label.includes('company') || label.includes('firmanavn') || label.includes('raison sociale') || label.includes('nom commercial')) companyName = value;
                        else if (label.includes('registration') || label.includes('cvr') || label.includes('rcs') || label.includes('vat') || label.includes('siren') || label.includes('siret')) registrationNumber = value;
                        else if (label.includes('email') || label === 'e-mail' || label === 'courriel') email = value;
                        else if (label.includes('phone') || label === 'telefon' || label === 'téléphone' || label === 'tél' || label.includes('mobile')) phone = value;
                        else if (label === 'address' || label === 'adresse') address = value;
                    }

                    const pageText = await tab.evaluate(() => document.body.innerText || '');
                    const ratingMatch = pageText.match(/(\d\.\d{1,2})\s*[·•]\s*[\d,]+\s*review/i)
                        || pageText.match(/Rated\s+([\d.]+)\s+out of 5/i)
                        || pageText.match(/(\d\.\d{1,2})\s*★/);
                    const starRating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                    const reviewMatch = pageText.match(/[\d.]+\s*[·•]\s*([\d,]+)\s*review/i)
                        || pageText.match(/([\d,]+)\s+reviews?/i);
                    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;

                    if ((companyName || email || phone) && !seenCompanies.has(email || companyName)) {
                        seenCompanies.add(email || companyName);
                        console.log(`    ✅ ${companyName} | ${email} | ${phone}`);
                        await Actor.pushData({
                            url: listingUrl, city, companyName, email, phone,
                            address, registrationNumber, starRating, reviewCount,
                            isBusinessHost: true, scrapedAt: new Date().toISOString(),
                        });
                    } else if (companyName || email || phone) {
                        console.log(`    ⏭️ Duplicate: ${companyName || email}`);
                    } else {
                        console.log(`    ⚠️ No details extracted`);
                    }
                } catch (err) {
                    console.log(`    ❌ Error: ${err.message}`);
                } finally {
                    await tab.close();
                    await sleep(2000); // pause between listings to avoid proxy overload
                }
            }

            // Pagination
            console.log('  Finding next page...');
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await sleep(3000);

            const navLinks = await page.$$('nav a[href]');
            let nextLink = null;
            for (const link of navLinks) {
                const text = await link.textContent();
                if (text?.trim() === String(pageNum + 1)) { nextLink = link; break; }
            }
            if (!nextLink && navLinks.length > 0) nextLink = navLinks[navLinks.length - 1];

            if (!nextLink) { console.log('  No next page — done.'); break; }

            const linkText = await nextLink.textContent();
            console.log(`  Clicking: "${linkText?.trim()}"`);

            const firstBefore = await page.evaluate(() => {
                const l = document.querySelector('a[href*="/rooms/"]');
                return l ? l.href : '';
            });

            await nextLink.click();

            let changed = false;
            for (let i = 0; i < 20; i++) {
                await sleep(1000);
                const firstAfter = await page.evaluate(() => {
                    const l = document.querySelector('a[href*="/rooms/"]');
                    return l ? l.href : '';
                });
                if (firstAfter && firstAfter !== firstBefore) {
                    changed = true;
                    console.log('  ✅ New page loaded');
                    break;
                }
            }
            if (!changed) { console.log('  Page did not change — done.'); break; }
            await sleep(3000);
        }

        console.log('\nDone!');
    },
});

await crawler.run([{ url: startUrl }]);
await Actor.exit();

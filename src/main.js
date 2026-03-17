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
    countryCode: 'FR',
});

const seenUrls = new Set();
const seenCompanies = new Set();

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    headless: true,
    navigationTimeoutSecs: 90,
    requestHandlerTimeoutSecs: 3600,
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

            await page.waitForSelector('a[href*="/rooms/"]', { timeout: 20000 }).catch(() => {});
            await sleep(4000);

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

            // Process each listing in a new tab — two-step navigation to avoid homepage redirect
            for (const listingUrl of newUrls) {
                seenUrls.add(listingUrl);
                console.log(`  Processing: ${listingUrl}`);

                const context = page.context();
                const tab = await context.newPage();

                try {
                    // STEP 1: Load the listing page first to establish session cookies
                    await tab.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await sleep(3000);

                    // STEP 2: Navigate to modal URL now that session is established
                    const modalUrl = `${listingUrl}?modal=PROFESSIONAL_HOST_DETAILS`;
                    await tab.goto(modalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await tab.waitForSelector('[role="dialog"]', { timeout: 15000 }).catch(() => {});
                    await sleep(2000);

                    const tabTitle = await tab.title();
                    console.log(`    Tab: ${tabTitle.substring(0, 60)}`);

                    // Extract modal text
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

                    // Parse fields using colon-based extraction
                    let companyName = null, email = null, phone = null,
                        address = null, registrationNumber = null;

                    const lines = modalText.split('\n').map(l => l.trim()).filter(Boolean);

                    function extract(lines, patterns) {
                        for (let i = 0; i < lines.length; i++) {
                            const lower = lines[i].toLowerCase();
                            for (const pat of patterns) {
                                if (lower.includes(pat)) {
                                    const ci = lines[i].indexOf(':');
                                    if (ci !== -1) {
                                        const after = lines[i].substring(ci + 1).trim();
                                        if (after.length > 1) return after;
                                    }
                                    const next = (lines[i + 1] || '').trim();
                                    if (next && next.length > 1) return next;
                                }
                            }
                        }
                        return null;
                    }

                    companyName     = extract(lines, ['business name', 'company name', "nom de l'entreprise", 'firmenname', 'nombre de empresa', 'ragione sociale', 'firmanavn']);
                    email           = extract(lines, ['email', 'e-mail', 'courriel']);
                    phone           = extract(lines, ['phone', 'telephone', 'téléphone', 'telefon', 'teléfono', 'mobile']);
                    registrationNumber = extract(lines, ['registration number', 'company number', 'cvr', 'siret', 'siren', 'rcs', 'handelsregister', 'kvk', 'registro', 'ico', 'nip', 'vat']);
                    address         = extract(lines, ['address', 'adresse', 'adresa', 'dirección', 'indirizzo']);

                    // Skip generic registry descriptions
                    const generic = ['business registry', 'trade and company', 'handelsregister', 'registro mercantil', 'chambre de commerce'];
                    if (companyName && generic.some(g => companyName.toLowerCase().includes(g))) companyName = null;

                    // Rating and reviews
                    const pageText = await tab.evaluate(() => document.body.innerText || '');
                    const ratingMatch = pageText.match(/(\d\.\d{1,2})\s*[·•]\s*[\d,]+\s*review/i)
                        || pageText.match(/Rated\s+([\d.]+)\s+out of 5/i)
                        || pageText.match(/(\d\.\d{1,2})\s*★/);
                    const starRating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                    const reviewMatch = pageText.match(/[\d.]+\s*[·•]\s*([\d,]+)\s*review/i)
                        || pageText.match(/([\d,]+)\s+reviews?/i);
                    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;

                    const key = email || companyName;
                    if ((companyName || email || phone) && key && !seenCompanies.has(key)) {
                        seenCompanies.add(key);
                        console.log(`    ✅ ${companyName} | ${email} | ${phone}`);
                        await Actor.pushData({
                            url: listingUrl, city, companyName, email, phone,
                            address, registrationNumber, starRating, reviewCount,
                            isBusinessHost: true, scrapedAt: new Date().toISOString(),
                        });
                    } else {
                        console.log(`    ⚠️ No details extracted`);
                    }
                } catch (err) {
                    console.log(`    ⚡ Error: ${err.message.substring(0, 100)}`);
                } finally {
                    await tab.close();
                }
            }

            // ── PAGINATION: click page number link via Playwright handle ──
            console.log('  Finding next page...');
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await sleep(3000);

            const navLinks = await page.$$('nav a[href]');
            let nextLink = null;

            for (const link of navLinks) {
                const text = await link.textContent();
                if (text?.trim() === String(pageNum + 1)) {
                    nextLink = link;
                    break;
                }
            }
            // Fallback: last nav link (the > arrow)
            if (!nextLink && navLinks.length > 0) {
                nextLink = navLinks[navLinks.length - 1];
            }

            if (!nextLink) {
                console.log('  No next page link — done.');
                break;
            }

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
            if (!changed) {
                console.log('  Page did not change — done.');
                break;
            }
            await sleep(3000);
        }

        console.log('\nDone!');
    },
});

await crawler.run([{ url: startUrl }]);
await Actor.exit();

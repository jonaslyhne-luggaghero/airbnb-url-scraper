import { Actor } from 'apify';
import { PlaywrightCrawler } from '@crawlee/playwright';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const city = input.city ?? 'Copenhagen';
const maxPages = input.maxPages ?? 10;

const CITIES = {
    'Copenhagen':   { ne_lat: 55.730, ne_lng: 12.660, sw_lat: 55.630, sw_lng: 12.490 },
    'Paris':        { ne_lat: 48.910, ne_lng: 2.420,  sw_lat: 48.810, sw_lng: 2.270  },
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

const coords = CITIES[city] || CITIES['Copenhagen'];
const startUrl = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=12`;

console.log(`Searching ${city} for business hosts (max ${maxPages} pages)...`);

const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: 'IE',
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    headless: true,
    navigationTimeoutSecs: 90,
    requestHandlerTimeoutSecs: 600,
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

            await page.waitForLoadState('domcontentloaded');
            await sleep(5000);

            // ── Find all listing cards that say "Business host" ──
            const businessListingUrls = await page.evaluate(() => {
                const results = [];
                // Each listing card is an <a> tag containing listing info
                const cards = document.querySelectorAll('a[href*="/rooms/"]');
                for (const card of cards) {
                    const text = card.innerText || card.textContent || '';
                    if (text.includes('Business host')) {
                        const href = card.getAttribute('href');
                        if (href && href.includes('/rooms/')) {
                            const url = href.startsWith('http') ? href : `https://www.airbnb.com${href}`;
                            // Remove query params to get clean URL
                            results.push(url.split('?')[0]);
                        }
                    }
                }
                return [...new Set(results)];
            });

            console.log(`  Found ${businessListingUrls.length} business host listings on this page`);

            // ── Visit each business listing and extract details ──
            for (const listingUrl of businessListingUrls) {
                console.log(`  Processing: ${listingUrl}`);

                try {
                    // Navigate to the modal directly
                    const modalUrl = `${listingUrl}?modal=PROFESSIONAL_HOST_DETAILS`;
                    await page.goto(modalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await sleep(4000);

                    // Find modal
                    let modalText = '';
                    const modalSelectors = ['[role="dialog"]', '[data-testid="modal-container"]', '[aria-modal="true"]'];
                    for (const sel of modalSelectors) {
                        try {
                            await page.waitForSelector(sel, { timeout: 5000 });
                            const el = await page.$(sel);
                            if (el) {
                                modalText = await page.evaluate(el => el.innerText || '', el);
                                if (modalText.length > 50) break;
                            }
                        } catch (e) { /* try next */ }
                    }

                    if (!modalText || modalText.length < 50) {
                        modalText = await page.evaluate(() => document.body.innerText || '');
                    }

                    // Parse fields from modal text
                    let companyName = null, email = null, phone = null;
                    let address = null, registrationNumber = null, city_val = null;
                    let starRating = null, reviewCount = null;

                    const lines = modalText.split('\n').map(l => l.trim()).filter(Boolean);
                    for (const line of lines) {
                        const colonIdx = line.indexOf(':');
                        if (colonIdx === -1) continue;
                        const label = line.substring(0, colonIdx).trim().toLowerCase();
                        const value = line.substring(colonIdx + 1).trim();
                        if (!value) continue;

                        if (label.includes('business name') || label.includes('company') || label.includes('firmanavn') || label.includes('raison sociale')) companyName = value;
                        else if (label.includes('registration') || label.includes('cvr') || label.includes('rcs') || label.includes('vat number')) registrationNumber = value;
                        else if (label === 'email' || label === 'e-mail' || label === 'courriel') email = value;
                        else if (label === 'phone' || label === 'telefon' || label === 'téléphone') phone = value;
                        else if (label === 'address' || label === 'adresse') address = value;
                    }

                    // Get city, rating, reviews from the listing page
                    const pageText = await page.evaluate(() => document.body.innerText || '');
                    const ratingMatch = pageText.match(/(\d\.\d{1,2})\s*[·•]\s*\d+\s*review/i);
                    if (ratingMatch) starRating = parseFloat(ratingMatch[1]);
                    const reviewMatch = pageText.match(/[\d.]+\s*[·•]\s*(\d+)\s*review/i);
                    if (reviewMatch) reviewCount = parseInt(reviewMatch[1]);
                    const cityMatch = pageText.match(/(?:Entire|Room|Private|Shared|Apartment|House|Hotel)[^\n]*in\s+([A-Z][a-zA-Z\s\-]+),\s*(?:France|Denmark|Germany|Spain|Italy|Netherlands|Austria|Belgium|Sweden|Norway|Finland|Poland|Czech|Hungary|Portugal|Ireland)/);
                    if (cityMatch) city_val = cityMatch[1].trim();
                    if (!city_val) city_val = city;

                    if (companyName || email || phone) {
                        console.log(`    ✅ ${companyName} | ${email} | ${phone}`);
                        await Actor.pushData({
                            url: listingUrl,
                            city: city_val,
                            companyName,
                            email,
                            phone,
                            address,
                            registrationNumber,
                            starRating,
                            reviewCount,
                            isBusinessHost: true,
                            scrapedAt: new Date().toISOString(),
                        });
                    } else {
                        console.log(`    ⚠️ Business host but no company details extracted`);
                    }

                    // Go back to search results
                    await page.goto(page.url().split('?')[0].replace('/rooms/', '/s/').split('/rooms')[0] || startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
                    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                    await sleep(3000);

                } catch (err) {
                    console.log(`    ❌ Error: ${err.message}`);
                }
            }

            // ── Click next page ──────────────────────────────────
            console.log('  Looking for next page button...');

            // Navigate back to search page if we left it
            const currentUrl = page.url();
            if (!currentUrl.includes('/s/')) {
                console.log('  Navigating back to search...');
                await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await sleep(5000);
            }

            const hasNext = await page.evaluate(() => {
                const nav = document.querySelector('nav');
                if (!nav) return false;
                const btns = [...nav.querySelectorAll('a, button')];
                const last = btns[btns.length - 1];
                if (!last) return false;
                if (last.getAttribute('aria-disabled') === 'true') return false;
                if (last.hasAttribute('disabled')) return false;
                return true;
            });

            if (!hasNext) {
                console.log('  No more pages.');
                break;
            }

            await page.evaluate(() => {
                const nav = document.querySelector('nav');
                if (!nav) return;
                const btns = [...nav.querySelectorAll('a, button')];
                btns[btns.length - 1]?.click();
            });

            console.log('  Clicked next page, waiting...');
            await sleep(6000);
        }

        console.log('\nDone scraping all pages!');
    },
});

await crawler.run([{ url: startUrl }]);
await Actor.exit();

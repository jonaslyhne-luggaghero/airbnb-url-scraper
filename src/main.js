import { PlaywrightCrawler } from '@crawlee/playwright';
import { Actor } from 'apify';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const city = input.city ?? 'Copenhagen';
const maxPages = input.maxPages ?? 10;

const CITY_URLS = {
    'Copenhagen': 'Copenhagen--Denmark',
    'Paris': 'Paris--France',
    'Berlin': 'Berlin--Germany',
    'Amsterdam': 'Amsterdam--Netherlands',
    'Rome': 'Rome--Italy',
    'Barcelona': 'Barcelona--Spain',
    'Vienna': 'Vienna--Austria',
    'Prague': 'Prague--Czech-Republic',
    'Lisbon': 'Lisbon--Portugal',
    'Dublin': 'Dublin--Ireland',
    'Brussels': 'Brussels--Belgium',
    'Warsaw': 'Warsaw--Poland',
    'Budapest': 'Budapest--Hungary',
    'Stockholm': 'Stockholm--Sweden',
    'Oslo': 'Oslo--Norway',
    'Helsinki': 'Helsinki--Finland',
    'Zurich': 'Zurich--Switzerland',
    'Munich': 'Munich--Germany',
    'Hamburg': 'Hamburg--Germany',
    'Milan': 'Milan--Italy',
};

const CITY_PLACE_IDS = {
    'Copenhagen': 'ChIJIXslnXxTUkYROM9UXS9XCEY',
    'Paris':      'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
    'Berlin':     'ChIJAVkDPzdOqEcRcDteW0YgIQQ',
    'Amsterdam':  'ChIJVXealLU_xkcRja_At0z9AGQ',
    'Rome':       'ChIJu46S-ZZhLxMROG5lkwZ3D7k',
    'Barcelona':  'ChIJ5TCOcRaYpBIRCmZHTz37sEQ',
    'Vienna':     'ChIJn8N5CR47bUcRRluiXm7Sbr4',
    'Prague':     'ChIJi3lwCZyTC0cRsV1MBHRMlhM',
    'Lisbon':     'ChIJO_PkYRozGQ0R0DaQ5L3rAAQ',
    'Dublin':     'ChIJYSWcYMlAEg0RSfQCLSe700Q',
    'Brussels':   'ChIJZ2jCRO_Ew0cRKKGoPpxv0jY',
    'Warsaw':     'ChIJAZ-GmmbMHkcR_NPqiCq-8HI',
    'Budapest':   'ChIJyc_U0TTDQUcRmBxTBKhcCcI',
    'Stockholm':  'ChIJywtkGTF2X0YRoMCifuDqKBY',
    'Oslo':       'ChIJOfBn8mFuQUYRmh4j019gkn4',
    'Helsinki':   'ChIJkQYhlscLkkYRB2XmBFqO9n8',
    'Zurich':     'ChIJGaK-SZcLkEcRe07V4A0rCo8',
    'Munich':     'ChIJ2V-Mo_l1nkcRlfp5jGBaehY',
    'Hamburg':    'ChIJuRMYfoNhsUcRoDrWe_I9JgQ',
    'Milan':      'ChIJ53USP0nBhkcRjQ50xhPN_zw',
};

console.log(`Searching ${city} for business hosts (max ${maxPages} pages)...`);

const citySlug = CITY_URLS[city] || encodeURIComponent(city);
const placeId = CITY_PLACE_IDS[city] || CITY_PLACE_IDS['Copenhagen'];
const startUrl = `https://www.airbnb.com/s/${citySlug}/homes?refinement_paths%5B%5D=%2Fhomes&place_id=${placeId}&search_type=AUTOSUGGEST`;

const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: 'FR',
});

const seenUrls = new Set();
const seenCompanies = new Set();
const results = [];

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestRetries: 2,
    requestHandlerTimeoutSecs: 3600,
    maxConcurrency: 1,
    requestHandler: async ({ page }) => {

        // Navigate to start
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        try {
            await page.waitForSelector('a[href*="/rooms/"]', { timeout: 30000 });
        } catch {
            console.log('Timeout waiting for listings on page 1 — stopping.');
            return;
        }
        await new Promise(r => setTimeout(r, 6000));

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`\n--- Page ${pageNum} ---`);
            console.log(`  URL: ${page.url()}`);

            // Collect business host URLs on this page
            const businessUrls = await page.evaluate(() => {
                const urls = [];
                const allLinks = document.querySelectorAll('a[href*="/rooms/"]');
                for (const link of allLinks) {
                    const container = link.closest('div[class]') || link.parentElement;
                    if (!container) continue;
                    const text = container.innerText || '';
                    if (text.includes('Business host') || text.includes('Business Host')) {
                        const href = link.getAttribute('href') || '';
                        const match = href.match(/\/rooms\/(\d+)/);
                        if (match) urls.push(`https://www.airbnb.com/rooms/${match[1]}`);
                    }
                }
                return [...new Set(urls)];
            });

            const newUrls = businessUrls.filter(u => !seenUrls.has(u));
            newUrls.forEach(u => seenUrls.add(u));
            console.log(`  Found ${businessUrls.length} business hosts, ${newUrls.length} new`);

            // Process each business listing
            for (const listingUrl of newUrls) {
                console.log(`  Processing: ${listingUrl}`);
                try {
                    // Step 1: load listing to get session
                    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await new Promise(r => setTimeout(r, 4000));

                    // Step 2: load modal
                    await page.goto(`${listingUrl}?modal=PROFESSIONAL_HOST_DETAILS`, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await new Promise(r => setTimeout(r, 4000));
                    await page.waitForSelector('[role="dialog"]', { timeout: 15000 }).catch(() => {});

                    const title = await page.title();
                    console.log(`    Tab: ${title.substring(0, 60)}`);

                    const details = await page.evaluate(() => {
                        const dialog = document.querySelector('[role="dialog"]');
                        const root = dialog || document;
                        const lines = (root.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);

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

                        const companyName     = extract(lines, ['business name', 'company name', "nom de l'entreprise", 'firmenname', 'nombre de empresa', 'ragione sociale']);
                        const email           = extract(lines, ['email', 'e-mail', 'courriel']);
                        const phone           = extract(lines, ['phone', 'telephone', 'téléphone', 'telefon', 'teléfono']);
                        const registrationNum = extract(lines, ['registration number', 'company number', 'cvr', 'siret', 'siren', 'handelsregister', 'kvk', 'registro', 'ico', 'nip']);
                        const vatNumber       = extract(lines, ['vat', 'tax id', 'tva', 'umsatzsteuer', 'cif']);
                        const address         = extract(lines, ['address', 'adresse', 'adresa', 'dirección', 'indirizzo']);

                        const fullText = document.body.innerText || '';
                        const ratingMatch = fullText.match(/(\d+\.\d+)\s*(?:out of 5|\([\d,]+ reviews?\))/);
                        const reviewMatch = fullText.match(/(\d[\d,]*)\s+reviews?/i);

                        return {
                            companyName,
                            email,
                            phone,
                            registrationNumber: registrationNum,
                            vatNumber,
                            address,
                            starRating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
                            reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(',', '')) : null,
                        };
                    });

                    const generic = ['business registry', 'trade and company', 'handelsregister', 'registro mercantil', 'chambre de commerce'];
                    if (details.companyName && generic.some(g => details.companyName.toLowerCase().includes(g))) {
                        details.companyName = null;
                    }

                    if (details.companyName || details.email || details.phone) {
                        const key = details.companyName || details.email || listingUrl;
                        if (!seenCompanies.has(key)) {
                            seenCompanies.add(key);
                            const record = { ...details, city, url: listingUrl, isBusinessHost: true };
                            results.push(record);
                            await Actor.pushData(record);
                            console.log(`    ✅ ${details.companyName} | ${details.email} | ${details.phone}`);
                        } else {
                            console.log(`    ⏭️ Duplicate: ${key}`);
                        }
                    } else {
                        console.log(`    ⚠️ No details extracted`);
                    }
                } catch (err) {
                    console.log(`    ⚡ Error: ${err.message.substring(0, 100)}`);
                }
                await new Promise(r => setTimeout(r, 2000));
            }

            if (pageNum >= maxPages) break;

            // Go back to search page and click the next page number
            console.log(`  Finding next page...`);
            await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForSelector('a[href*="/rooms/"]', { timeout: 30000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 4000));

            // Scroll to bottom so pagination nav renders
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));

            // Click page number (pageNum + 1)
            const targetPage = pageNum + 1;
            const clicked = await page.evaluate((target) => {
                const nav = document.querySelector('nav');
                if (!nav) return null;
                const links = [...nav.querySelectorAll('a')];
                for (const link of links) {
                    if (link.textContent.trim() === String(target)) {
                        link.click();
                        return target;
                    }
                }
                // Fallback: click the > arrow
                for (const link of links) {
                    const t = link.textContent.trim();
                    if (t === '›' || t === '>' || t === '→' || t === '»') {
                        link.click();
                        return 'arrow';
                    }
                }
                return null;
            }, targetPage);

            if (!clicked) {
                console.log('  No next page found — done.');
                break;
            }

            console.log(`  Clicking: "${clicked}"`);
            await new Promise(r => setTimeout(r, 3000));
            await page.waitForSelector('a[href*="/rooms/"]', { timeout: 20000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 3000));
            console.log(`  ✅ New page loaded`);
        }

        console.log(`\nDone! Found ${results.length} unique business hosts.`);
    },
});

await crawler.run([{ url: startUrl }]);
await Actor.exit();

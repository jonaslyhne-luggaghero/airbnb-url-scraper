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

const CITIES = {
    'Copenhagen': { ne_lat: 55.700, ne_lng: 12.620, sw_lat: 55.660, sw_lng: 12.540 },
    'Paris':      { ne_lat: 48.950, ne_lng: 2.470,  sw_lat: 48.790, sw_lng: 2.220  },
    'Berlin':     { ne_lat: 52.570, ne_lng: 13.480, sw_lat: 52.460, sw_lng: 13.320 },
    'Amsterdam':  { ne_lat: 52.410, ne_lng: 4.970,  sw_lat: 52.340, sw_lng: 4.840  },
    'Rome':       { ne_lat: 41.940, ne_lng: 12.540, sw_lat: 41.860, sw_lng: 12.430 },
    'Barcelona':  { ne_lat: 41.430, ne_lng: 2.220,  sw_lat: 41.350, sw_lng: 2.100  },
    'Vienna':     { ne_lat: 48.270, ne_lng: 16.450, sw_lat: 48.170, sw_lng: 16.300 },
    'Prague':     { ne_lat: 50.130, ne_lng: 14.510, sw_lat: 50.040, sw_lng: 14.380 },
    'Lisbon':     { ne_lat: 38.770, ne_lng: -9.080, sw_lat: 38.690, sw_lng: -9.220 },
    'Dublin':     { ne_lat: 53.380, ne_lng: -6.190, sw_lat: 53.310, sw_lng: -6.320 },
    'Brussels':   { ne_lat: 50.890, ne_lng: 4.430,  sw_lat: 50.820, sw_lng: 4.310  },
    'Warsaw':     { ne_lat: 52.290, ne_lng: 21.080, sw_lat: 52.190, sw_lng: 20.930 },
    'Budapest':   { ne_lat: 47.560, ne_lng: 19.100, sw_lat: 47.450, sw_lng: 18.980 },
    'Stockholm':  { ne_lat: 59.370, ne_lng: 18.130, sw_lat: 59.290, sw_lng: 17.980 },
    'Oslo':       { ne_lat: 59.960, ne_lng: 10.820, sw_lat: 59.880, sw_lng: 10.680 },
    'Helsinki':   { ne_lat: 60.200, ne_lng: 25.050, sw_lat: 60.140, sw_lng: 24.900 },
    'Zurich':     { ne_lat: 47.410, ne_lng: 8.600,  sw_lat: 47.340, sw_lng: 8.490  },
    'Munich':     { ne_lat: 48.180, ne_lng: 11.650, sw_lat: 48.090, sw_lng: 11.490 },
    'Hamburg':    { ne_lat: 53.620, ne_lng: 10.080, sw_lat: 53.520, sw_lng: 9.890  },
    'Milan':      { ne_lat: 45.510, ne_lng: 9.250,  sw_lat: 45.430, sw_lng: 9.120  },
};

console.log(`Searching ${city} for business hosts (max ${maxPages} pages)...`);

const coords = CITIES[city] || CITIES['Copenhagen'];
const citySlug = CITY_URLS[city] || encodeURIComponent(city);
const startUrl = `https://www.airbnb.com/s/${citySlug}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=12`;

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
        let nextPageUrl = startUrl;

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`\n--- Page ${pageNum} ---`);

            // Navigate to this search page
            await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            try {
                await page.waitForSelector('a[href*="/rooms/"]', { timeout: 30000 });
            } catch {
                console.log('  Timeout waiting for listings — stopping.');
                break;
            }
            await new Promise(r => setTimeout(r, 6000));
            console.log(`  URL: ${page.url()}`);

            // Collect business host URLs
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

            // Grab next page URL NOW before leaving search page
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));

            const grabbedNext = await page.evaluate(() => {
                const nav = document.querySelector('nav');
                if (!nav) return null;
                const links = [...nav.querySelectorAll('a[href]')];
                // Log all nav link texts for debugging
                const navInfo = links.map(l => l.textContent.trim() + '=' + l.href).join(' | ');
                // Try arrow labels
                for (const link of links) {
                    const t = (link.textContent || '').trim();
                    if (t === '›' || t === '>' || t === 'Next' || t === '→' || t === '»') return link.href;
                }
                // Find current page number, return next
                const current = nav.querySelector('[aria-current="page"]');
                if (current) {
                    const n = parseInt(current.textContent.trim());
                    if (!isNaN(n)) {
                        for (const link of links) {
                            if (parseInt((link.textContent || '').trim()) === n + 1) return link.href;
                        }
                    }
                }
                // Last resort: last nav link
                const nonCurrent = links.filter(l => !l.getAttribute('aria-current'));
                return nonCurrent.length > 0 ? nonCurrent[nonCurrent.length - 1].href : null;
            });

            console.log(`  Next page URL: ${grabbedNext ? grabbedNext.substring(0, 100) + '...' : 'none'}`);

            // Process each business listing
            for (const listingUrl of newUrls) {
                console.log(`  Processing: ${listingUrl}`);
                try {
                    // Step 1: load listing page to get session cookies
                    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await new Promise(r => setTimeout(r, 4000));

                    // Step 2: navigate to modal
                    const modalUrl = `${listingUrl}?modal=PROFESSIONAL_HOST_DETAILS`;
                    await page.goto(modalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
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

            // Stop or advance
            if (!grabbedNext || grabbedNext === nextPageUrl) {
                console.log('\n  No next page found — done.');
                break;
            }
            nextPageUrl = grabbedNext;
            console.log(`  → Moving to page ${pageNum + 1}`);
        }

        console.log(`\nDone! Found ${results.length} unique business hosts.`);
    },
});

await crawler.run([{ url: startUrl }]);
await Actor.exit();

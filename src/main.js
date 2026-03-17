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
    requestHandler: async ({ page, log }) => {
        let pageNum = 0;

        while (pageNum < maxPages) {
            pageNum++;
            console.log(`\n--- Page ${pageNum} ---`);
            console.log(`  URL: ${page.url()}`);

            // Wait for listing cards to appear
            try {
                await page.waitForSelector('a[href*="/rooms/"]', { timeout: 30000 });
            } catch {
                console.log('  Timeout waiting for listings — skipping page');
                break;
            }
            await new Promise(r => setTimeout(r, 8000));

            // Find all business host cards
            const businessUrls = await page.evaluate(() => {
                const cards = document.querySelectorAll('[data-testid="card-container"], [itemprop="itemListElement"], div[class*="g1qv1ctd"], div[class*="dir dir-ltr"]');
                const urls = [];
                for (const card of cards) {
                    const text = card.innerText || '';
                    if (text.includes('Business host') || text.includes('Business Host')) {
                        const link = card.querySelector('a[href*="/rooms/"]');
                        if (link) {
                            const href = link.getAttribute('href');
                            const match = href.match(/\/rooms\/(\d+)/);
                            if (match) urls.push(`https://www.airbnb.com/rooms/${match[1]}`);
                        }
                    }
                }
                // Fallback: search entire page HTML for business host near room links
                if (urls.length === 0) {
                    const html = document.body.innerHTML;
                    const allLinks = document.querySelectorAll('a[href*="/rooms/"]');
                    for (const link of allLinks) {
                        const container = link.closest('div[class]');
                        if (container) {
                            const containerText = container.innerText || '';
                            if (containerText.includes('Business host') || containerText.includes('Business Host')) {
                                const href = link.getAttribute('href');
                                const match = href.match(/\/rooms\/(\d+)/);
                                if (match) urls.push(`https://www.airbnb.com/rooms/${match[1]}`);
                            }
                        }
                    }
                }
                return [...new Set(urls)];
            });

            const newUrls = businessUrls.filter(u => !seenUrls.has(u));
            newUrls.forEach(u => seenUrls.add(u));
            console.log(`  Found ${businessUrls.length} business hosts, ${newUrls.length} new`);

            // Process each new business host listing
            for (const listingUrl of newUrls) {
                console.log(`  Processing: ${listingUrl}`);
                await new Promise(r => setTimeout(r, 2000));

                const context = page.context();
                const tab = await context.newPage();

                try {
                    // STEP 1: Load the listing page first to establish session
                    await tab.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await new Promise(r => setTimeout(r, 3000));

                    // STEP 2: Navigate to modal URL once session is established
                    const modalUrl = `${listingUrl}?modal=PROFESSIONAL_HOST_DETAILS`;
                    await tab.goto(modalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await new Promise(r => setTimeout(r, 4000));

                    // Wait for modal dialog to appear
                    await tab.waitForSelector('[role="dialog"]', { timeout: 15000 }).catch(() => {});

                    const tabTitle = await tab.title();
                    console.log(`    Tab: ${tabTitle.substring(0, 60)}`);

                    // Extract details from modal using label-based matching
                    const details = await tab.evaluate(() => {
                        const dialog = document.querySelector('[role="dialog"]');
                        const root = dialog || document;
                        const text = root.innerText || '';
                        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

                        let companyName = null, email = null, phone = null,
                            registrationNumber = null, vatNumber = null,
                            address = null;

                        for (let i = 0; i < lines.length; i++) {
                            const label = lines[i].toLowerCase();
                            const val = lines[i + 1] || '';
                            if (!companyName && (label.includes('business name') || label.includes('company name'))) companyName = val;
                            if (!email && label.includes('email')) email = val;
                            if (!phone && (label.includes('phone') || label.includes('telephone'))) phone = val;
                            if (!registrationNumber && (label.includes('registration') || label.includes('company number') || label.includes('cvr') || label.includes('siret') || label.includes('handelsregister'))) registrationNumber = val;
                            if (!vatNumber && (label.includes('vat') || label.includes('tax id') || label.includes('tva'))) vatNumber = val;
                            if (!address && label.includes('address')) address = val;
                        }

                        // Fallback: grab company name from dialog heading
                        if (!companyName && dialog) {
                            const heading = dialog.querySelector('h1, h2, h3, [class*="title"]');
                            if (heading) companyName = heading.innerText.trim();
                        }

                        // Extract rating and reviews from full page
                        const fullText = document.body.innerText || '';
                        const ratingMatch = fullText.match(/(\d+\.\d+)\s*(?:out of 5|\([\d,]+ reviews?\))/);
                        const reviewMatch = fullText.match(/(\d[\d,]*)\s+reviews?/i);

                        return {
                            companyName,
                            email,
                            phone,
                            registrationNumber,
                            vatNumber,
                            address,
                            starRating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
                            reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(',', '')) : null,
                        };
                    });

                    if (details.companyName) {
                        if (!seenCompanies.has(details.companyName)) {
                            seenCompanies.add(details.companyName);
                            const record = {
                                ...details,
                                city,
                                url: listingUrl,
                                isBusinessHost: true,
                            };
                            results.push(record);
                            await Actor.pushData(record);
                            console.log(`    ✅ ${details.companyName} | ${details.email} | ${details.phone}`);
                        } else {
                            console.log(`    ⏭️ Duplicate company: ${details.companyName}`);
                        }
                    } else {
                        console.log(`    ⚠️ No details extracted`);
                    }
                } catch (err) {
                    console.log(`    ⚡ Error: ${err.message.substring(0, 80)}`);
                } finally {
                    await tab.close();
                }
            }

            if (pageNum >= maxPages) break;

            // Navigate to next page
            console.log(`  Finding next page...`);
            try {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await new Promise(r => setTimeout(r, 2000));

                const nextUrl = await page.evaluate(() => {
                    const nav = document.querySelector('nav');
                    if (!nav) return null;
                    const links = nav.querySelectorAll('a[href]');
                    for (const link of links) {
                        const t = (link.textContent || '').trim();
                        if (t === '›' || t === '>' || t === 'Next' || t === '→') return link.href;
                    }
                    // Find current page number and get next
                    const current = nav.querySelector('a[aria-current="page"], button[aria-current="page"]');
                    if (current) {
                        const currentNum = parseInt(current.textContent.trim());
                        if (!isNaN(currentNum)) {
                            for (const link of links) {
                                if (parseInt(link.textContent.trim()) === currentNum + 1) return link.href;
                            }
                        }
                    }
                    return null;
                });

                if (nextUrl) {
                    const firstListingBefore = await page.evaluate(() => {
                        const link = document.querySelector('a[href*="/rooms/"]');
                        return link ? link.href : null;
                    });

                    await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await new Promise(r => setTimeout(r, 5000));

                    const firstListingAfter = await page.evaluate(() => {
                        const link = document.querySelector('a[href*="/rooms/"]');
                        return link ? link.href : null;
                    });

                    if (firstListingAfter === firstListingBefore) {
                        console.log('  Page did not change — done.');
                        break;
                    }
                    console.log(`  ✅ Navigated to next page`);
                } else {
                    // Fallback: try clicking the next button
                    const clicked = await page.evaluate(() => {
                        const nav = document.querySelector('nav');
                        if (!nav) return false;
                        const btns = nav.querySelectorAll('button, a');
                        const last = btns[btns.length - 1];
                        if (last) { last.click(); return true; }
                        return false;
                    });
                    if (!clicked) {
                        console.log('  No next page found — done.');
                        break;
                    }
                    await new Promise(r => setTimeout(r, 5000));
                }
            } catch (err) {
                console.log(`  Pagination error: ${err.message.substring(0, 80)}`);
                break;
            }
        }

        console.log(`\nDone! Found ${results.length} unique business hosts.`);
    },
});

await crawler.run([{ url: startUrl }]);
await Actor.exit();

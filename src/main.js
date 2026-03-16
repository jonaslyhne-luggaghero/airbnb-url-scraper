import { Actor } from 'apify';
import { PlaywrightCrawler } from '@crawlee/playwright';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const city = input.city ?? 'Copenhagen';
const maxListings = input.maxListings ?? 200;

const CITIES = {
    'Copenhagen':   { ne_lat: 55.700, ne_lng: 12.620, sw_lat: 55.660, sw_lng: 12.540 },
    'Paris':        { ne_lat: 48.890, ne_lng: 2.400,  sw_lat: 48.820, sw_lng: 2.290  },
    'Amsterdam':    { ne_lat: 52.395, ne_lng: 4.940,  sw_lat: 52.345, sw_lng: 4.870  },
    'Berlin':       { ne_lat: 52.540, ne_lng: 13.430, sw_lat: 52.490, sw_lng: 13.360 },
    'Barcelona':    { ne_lat: 41.410, ne_lng: 2.200,  sw_lat: 41.360, sw_lng: 2.140  },
    'Madrid':       { ne_lat: 40.440, ne_lng: -3.670, sw_lat: 40.390, sw_lng: -3.730 },
    'Rome':         { ne_lat: 41.920, ne_lng: 12.520, sw_lat: 41.870, sw_lng: 12.450 },
    'Vienna':       { ne_lat: 48.230, ne_lng: 16.390, sw_lat: 48.190, sw_lng: 16.330 },
    'Prague':       { ne_lat: 50.100, ne_lng: 14.460, sw_lat: 50.060, sw_lng: 14.400 },
    'Lisbon':       { ne_lat: 38.740, ne_lng: -9.120, sw_lat: 38.700, sw_lng: -9.170 },
    'Brussels':     { ne_lat: 50.870, ne_lng: 4.400,  sw_lat: 50.830, sw_lng: 4.340  },
    'Stockholm':    { ne_lat: 59.350, ne_lng: 18.090, sw_lat: 59.310, sw_lng: 18.020 },
    'Oslo':         { ne_lat: 59.930, ne_lng: 10.770, sw_lat: 59.890, sw_lng: 10.720 },
    'Helsinki':     { ne_lat: 60.190, ne_lng: 25.010, sw_lat: 60.150, sw_lng: 24.930 },
    'Munich':       { ne_lat: 48.160, ne_lng: 11.590, sw_lat: 48.120, sw_lng: 11.530 },
    'Hamburg':      { ne_lat: 53.580, ne_lng: 10.020, sw_lat: 53.540, sw_lng: 9.960  },
    'Warsaw':       { ne_lat: 52.260, ne_lng: 21.040, sw_lat: 52.210, sw_lng: 20.970 },
    'Budapest':     { ne_lat: 47.530, ne_lng: 19.080, sw_lat: 47.480, sw_lng: 19.010 },
    'Athens':       { ne_lat: 37.990, ne_lng: 23.760, sw_lat: 37.950, sw_lng: 23.700 },
    'Milan':        { ne_lat: 45.490, ne_lng: 9.220,  sw_lat: 45.450, sw_lng: 9.160  },
    'Zurich':       { ne_lat: 47.400, ne_lng: 8.570,  sw_lat: 47.360, sw_lng: 8.510  },
    'Dublin':       { ne_lat: 53.360, ne_lng: -6.220, sw_lat: 53.320, sw_lng: -6.290 },
    'Edinburgh':    { ne_lat: 55.970, ne_lng: -3.160, sw_lat: 55.930, sw_lng: -3.220 },
    'Krakow':       { ne_lat: 50.080, ne_lng: 19.970, sw_lat: 50.040, sw_lng: 19.910 },
    'Lyon':         { ne_lat: 45.780, ne_lng: 4.870,  sw_lat: 45.740, sw_lng: 4.810  },
    'Zagreb':       { ne_lat: 45.840, ne_lng: 16.020, sw_lat: 45.800, sw_lng: 15.960 },
    'Ljubljana':    { ne_lat: 46.080, ne_lng: 14.530, sw_lat: 46.040, sw_lng: 14.470 },
    'Riga':         { ne_lat: 56.970, ne_lng: 24.140, sw_lat: 56.930, sw_lng: 24.080 },
    'Tallinn':      { ne_lat: 59.460, ne_lng: 24.780, sw_lat: 59.420, sw_lng: 24.720 },
    'Vilnius':      { ne_lat: 54.710, ne_lng: 25.310, sw_lat: 54.670, sw_lng: 25.250 },
};

const coords = CITIES[city] || CITIES['Copenhagen'];
console.log(`Searching Airbnb listings in ${city} (max ${maxListings})...`);

// Build all page URLs upfront
const pageUrls = [];
const pages = Math.ceil(maxListings / 18);
for (let i = 0; i < pages; i++) {
    pageUrls.push({
        url: `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=14&items_offset=${i * 18}&section_offset=3`,
        label: `page_${i}`,
    });
}

const seenIds = new Set();
const allListings = [];

const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: 'IE',
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    headless: true,
    navigationTimeoutSecs: 90,
    requestHandlerTimeoutSecs: 120,
    maxConcurrency: 1,
    maxRequestRetries: 2,
    launchContext: {
        launchOptions: {
            args: ['--disable-gpu', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
        },
    },
    requestHandler: async ({ page, request }) => {
        console.log(`Processing ${request.label}...`);

        // Wait for listing content to fully render
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(5000);

        // Use full document HTML (includes script tags with Next.js data)
        const pageHtml = await page.evaluate(() => document.documentElement.innerHTML || '');
        console.log(`HTML size: ${pageHtml.length}`);

        // Extract all room IDs
        const allIdMatches = [...pageHtml.matchAll(/\/rooms\/(\d+)/g)];
        const pageIds = [...new Set(allIdMatches.map(m => m[1]))];
        console.log(`Found ${pageIds.length} raw IDs`);

        // Detect business hosts
        const businessIds = new Set();
        for (const id of pageIds) {
            const idIndex = pageHtml.indexOf(`/rooms/${id}`);
            if (idIndex === -1) continue;
            const start = Math.max(0, idIndex - 1500);
            const end = Math.min(pageHtml.length, idIndex + 1500);
            const context = pageHtml.substring(start, end);
            if (
                context.includes('Business host') ||
                context.includes('"businessHost"') ||
                context.includes('prohost-api') ||
                context.includes('"isProfessionalHost":true') ||
                context.includes('"hostType":"PROFESSIONAL"')
            ) {
                businessIds.add(id);
                console.log(`  ✅ Business host: /rooms/${id}`);
            }
        }

        console.log(`Business hosts on this page: ${businessIds.size}`);

        // Add new listings
        let newCount = 0;
        for (const id of pageIds) {
            if (!seenIds.has(id) && allListings.length < maxListings) {
                seenIds.add(id);
                allListings.push({
                    url: `https://www.airbnb.com/rooms/${id}`,
                    isBusinessHostFromSearch: businessIds.has(id),
                });
                newCount++;
            }
        }
        console.log(`New: ${newCount}, Total: ${allListings.length}`);
    },
});

await crawler.run(pageUrls);

const businessCount = allListings.filter(l => l.isBusinessHostFromSearch).length;
console.log(`\nTotal: ${allListings.length} listings, ${businessCount} flagged as business hosts`);

for (const listing of allListings) {
    await Actor.pushData(listing);
}

console.log(`Done! Pushed ${allListings.length} URLs to dataset.`);
await Actor.exit();

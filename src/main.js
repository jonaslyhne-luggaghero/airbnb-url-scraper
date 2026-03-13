import { Actor } from 'apify';
import { HttpCrawler } from '@crawlee/http';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const city = input.city ?? 'Copenhagen';
const maxListings = input.maxListings ?? 200;

// City centre bounding boxes
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
    'Bucharest':    { ne_lat: 44.460, ne_lng: 26.120, sw_lat: 44.420, sw_lng: 26.060 },
    'Athens':       { ne_lat: 37.990, ne_lng: 23.760, sw_lat: 37.950, sw_lng: 23.700 },
    'Milan':        { ne_lat: 45.490, ne_lng: 9.220,  sw_lat: 45.450, sw_lng: 9.160  },
    'Zurich':       { ne_lat: 47.400, ne_lng: 8.570,  sw_lat: 47.360, sw_lng: 8.510  },
    'Geneva':       { ne_lat: 46.220, ne_lng: 6.170,  sw_lat: 46.180, sw_lng: 6.120  },
    'Lyon':         { ne_lat: 45.780, ne_lng: 4.870,  sw_lat: 45.740, sw_lng: 4.810  },
    'Dublin':       { ne_lat: 53.360, ne_lng: -6.220, sw_lat: 53.320, sw_lng: -6.290 },
    'Edinburgh':    { ne_lat: 55.970, ne_lng: -3.160, sw_lat: 55.930, sw_lng: -3.220 },
    'Krakow':       { ne_lat: 50.080, ne_lng: 19.970, sw_lat: 50.040, sw_lng: 19.910 },
    'Valletta':     { ne_lat: 35.910, ne_lng: 14.530, sw_lat: 35.870, sw_lng: 14.490 },
    'Riga':         { ne_lat: 56.970, ne_lng: 24.140, sw_lat: 56.930, sw_lng: 24.080 },
    'Tallinn':      { ne_lat: 59.460, ne_lng: 24.780, sw_lat: 59.420, sw_lng: 24.720 },
    'Vilnius':      { ne_lat: 54.710, ne_lng: 25.310, sw_lat: 54.670, sw_lng: 25.250 },
    'Zagreb':       { ne_lat: 45.840, ne_lng: 16.020, sw_lat: 45.800, sw_lng: 15.960 },
    'Ljubljana':    { ne_lat: 46.080, ne_lng: 14.530, sw_lat: 46.040, sw_lng: 14.470 },
};

const coords = CITIES[city] || CITIES['Copenhagen'];
console.log(`Searching Airbnb listings in ${city} (max ${maxListings}), extracting business hosts from search results...`);

const allListings = [];
const seenIds = new Set();
let offset = 0;
const pageSize = 18;

while (allListings.length < maxListings) {
    const url = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=14&items_offset=${offset}&items_per_grid=${pageSize}&section_offset=3`;

    console.log(`Fetching page at offset ${offset}...`);

    let html = '';
    const crawler = new HttpCrawler({
        requestHandler: async ({ body }) => {
            html = body.toString();
        },
        maxRequestRetries: 2,
    });
    await crawler.run([{ url }]);

    if (!html) {
        console.log('Empty response, stopping.');
        break;
    }

    console.log(`Page size: ${html.length} characters`);

    // ── EXTRACT LISTING IDs AND BUSINESS HOST FLAG ──────────
    // Pull all room IDs from the page
    const idMatches = [...html.matchAll(/"id":"(\d{10,})"[^}]*"__typename":"StayListing"/g)];
    
    // Fallback: generic room ID extraction
    const fallbackIds = [...html.matchAll(/\/rooms\/(\d{6,})/g)].map(m => m[1]);
    
    // Find business host sections — Airbnb embeds "Business host" text near the listing ID in JSON
    // Extract JSON blobs that contain both a room ID and "Business host" indicator
    const businessHostPattern = /"listingId":"(\d{6,})"[^{}]{0,500}?"businessHostLabel"/gs;
    const businessHostMatches = [...html.matchAll(businessHostPattern)];
    const businessHostIds = new Set(businessHostMatches.map(m => m[1]));

    // Also scan for the exact text pairing in the page data
    const listingBlocks = html.split('"listing":{');
    for (const block of listingBlocks.slice(1)) {
        const idMatch = block.match(/"id":"(\d{6,})"/);
        const isBusinessHost = 
            block.includes('"Business host"') || 
            block.includes('"businessHost"') ||
            block.includes('"is_business_host":true') ||
            block.includes('"hostType":"business"') ||
            block.includes('"isProfessionalHost":true') ||
            block.substring(0, 2000).includes('prohost-api');
        
        if (idMatch && isBusinessHost) {
            businessHostIds.add(idMatch[1]);
        }
    }

    // Collect all IDs from this page
    const pageIds = new Set([
        ...idMatches.map(m => m[1]),
        ...fallbackIds,
    ]);

    let newCount = 0;
    for (const id of pageIds) {
        if (!seenIds.has(id) && allListings.length < maxListings) {
            seenIds.add(id);
            const isBusinessHost = businessHostIds.has(id);
            allListings.push({
                url: `https://www.airbnb.com/rooms/${id}`,
                isBusinessHostFromSearch: isBusinessHost,
            });
            newCount++;
        }
    }

    console.log(`Page offset ${offset}: found ${pageIds.size} IDs, ${businessHostIds.size} business hosts on this page (${newCount} new, total: ${allListings.length})`);

    if (newCount === 0) {
        console.log('No new listings found, stopping pagination.');
        break;
    }

    offset += pageSize;
    await new Promise(r => setTimeout(r, 1000));
}

console.log(`\nTotal listings found: ${allListings.length}`);
console.log(`Business hosts detected from search: ${allListings.filter(l => l.isBusinessHostFromSearch).length}`);

// Push ALL listings — the business scraper will verify and extract details
// But flag the ones already detected as business hosts so the scraper can prioritise them
for (const listing of allListings) {
    await Actor.pushData(listing);
}

console.log(`Done! Pushed ${allListings.length} URLs to dataset.`);
await Actor.exit();

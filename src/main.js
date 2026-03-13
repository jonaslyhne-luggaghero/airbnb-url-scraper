import { Actor } from 'apify';

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
    'Lisbon':       { ne_lat: 38.740, ne_lng: -9.120, sw_lat: 38.700, sw_lng: -9.170 },
    'Zagreb':       { ne_lat: 45.840, ne_lng: 16.020, sw_lat: 45.800, sw_lng: 15.960 },
    'Ljubljana':    { ne_lat: 46.080, ne_lng: 14.530, sw_lat: 46.040, sw_lng: 14.470 },
    'Riga':         { ne_lat: 56.970, ne_lng: 24.140, sw_lat: 56.930, sw_lng: 24.080 },
    'Tallinn':      { ne_lat: 59.460, ne_lng: 24.780, sw_lat: 59.420, sw_lng: 24.720 },
    'Vilnius':      { ne_lat: 54.710, ne_lng: 25.310, sw_lat: 54.670, sw_lng: 25.250 },
};

const coords = CITIES[city] || CITIES['Copenhagen'];
console.log(`Searching Airbnb listings in ${city} (max ${maxListings})...`);

const seenIds = new Set();
const allListings = [];
let offset = 0;

while (allListings.length < maxListings) {
    const url = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=14&items_offset=${offset}&section_offset=3`;

    console.log(`Fetching page at offset ${offset}...`);

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
    });
    const html = await res.text();
    console.log(`Page size: ${html.length} characters`);

    // ── STEP 1: Extract all valid room IDs ──────────────────
    // Only match IDs that appear inside proper /rooms/ paths — this avoids fake sequential IDs
    const roomIdMatches = [...html.matchAll(/\/rooms\/(\d{7,})/g)];
    const pageIds = [...new Set(roomIdMatches.map(m => m[1]))];

    // Filter out IDs that are clearly sequential/fake (differ by less than 100 from each other)
    const sortedIds = [...pageIds].sort((a, b) => Number(a) - Number(b));
    const validIds = [];
    for (let i = 0; i < sortedIds.length; i++) {
        const id = sortedIds[i];
        const prev = sortedIds[i - 1];
        // Skip if this ID is suspiciously close to the previous one (sequential fake IDs)
        if (prev && Math.abs(Number(id) - Number(prev)) < 50) continue;
        validIds.push(id);
    }

    console.log(`Found ${pageIds.length} raw IDs, ${validIds.length} valid after filtering`);

    // ── STEP 2: Check which IDs are business hosts ──────────
    // Find all listing JSON blocks and check for business host signals near the ID
    const businessIds = new Set();

    // Method A: find "Business host" text near a room ID in the same JSON chunk
    // Split on listing boundaries and check each chunk
    const chunks = html.split('"url":"/rooms/');
    for (const chunk of chunks.slice(1)) {
        const idMatch = chunk.match(/^(\d{6,})/);
        if (!idMatch) continue;
        const id = idMatch[1];
        // Look at the surrounding 3000 chars for business signals
        const context = chunk.substring(0, 3000);
        if (
            context.includes('"Business host"') ||
            context.includes('"businessHost"') ||
            context.includes('Business host') ||
            context.includes('"is_business_travel_ready":true') ||
            context.includes('prohost-api') ||
            context.includes('"hostType":"PROFESSIONAL"') ||
            context.includes('"isProfessionalHost":true')
        ) {
            businessIds.add(id);
            console.log(`  → Business host detected for room ${id}`);
        }
    }

    // Method B: search the raw HTML for "Business host" and find nearby room IDs
    const businessHostRegex = /Business host/g;
    let bMatch;
    while ((bMatch = businessHostRegex.exec(html)) !== null) {
        // Look backwards up to 2000 chars for a room ID
        const before = html.substring(Math.max(0, bMatch.index - 2000), bMatch.index);
        const idInBefore = [...before.matchAll(/\/rooms\/(\d{7,})/g)];
        if (idInBefore.length > 0) {
            const closestId = idInBefore[idInBefore.length - 1][1]; // last = closest
            businessIds.add(closestId);
            console.log(`  → Business host (method B) detected for room ${closestId}`);
        }
    }

    console.log(`Business hosts on this page: ${businessIds.size}`);

    // ── STEP 3: Add new listings ────────────────────────────
    let newCount = 0;
    for (const id of validIds) {
        if (!seenIds.has(id) && allListings.length < maxListings) {
            seenIds.add(id);
            allListings.push({
                url: `https://www.airbnb.com/rooms/${id}`,
                isBusinessHostFromSearch: businessIds.has(id),
            });
            newCount++;
        }
    }

    console.log(`New listings added: ${newCount} (total: ${allListings.length})`);

    if (newCount === 0) {
        console.log('No new listings found, stopping pagination.');
        break;
    }

    offset += 18;
    await new Promise(r => setTimeout(r, 1200));
}

const businessCount = allListings.filter(l => l.isBusinessHostFromSearch).length;
console.log(`\nTotal: ${allListings.length} listings, ${businessCount} flagged as business hosts from search page`);

for (const listing of allListings) {
    await Actor.pushData(listing);
}

console.log(`Done! Pushed ${allListings.length} URLs to dataset.`);
await Actor.exit();

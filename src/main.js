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
    'Zagreb':       { ne_lat: 45.840, ne_lng: 16.020, sw_lat: 45.800, sw_lng: 15.960 },
    'Ljubljana':    { ne_lat: 46.080, ne_lng: 14.530, sw_lat: 46.040, sw_lng: 14.470 },
    'Riga':         { ne_lat: 56.970, ne_lng: 24.140, sw_lat: 56.930, sw_lng: 24.080 },
    'Tallinn':      { ne_lat: 59.460, ne_lng: 24.780, sw_lat: 59.420, sw_lng: 24.720 },
    'Vilnius':      { ne_lat: 54.710, ne_lng: 25.310, sw_lat: 54.670, sw_lng: 25.250 },
};

const coords = CITIES[city] || CITIES['Copenhagen'];
console.log(`Searching Airbnb listings in ${city} (max ${maxListings})...`);

// Use Airbnb's internal API endpoint — this is what pyairbnb uses and bypasses bot detection
const seenIds = new Set();
const allListings = [];
let cursor = null;
let page = 0;

while (allListings.length < maxListings) {
    page++;

    // Build the API URL with pagination cursor
    const variables = {
        isInitialLoad: cursor === null,
        hasLoggedIn: false,
        cdnCacheSafe: false,
        source: 'EXPLORE',
        exploreRequest: {
            rawParams: [
                { filterName: 'cdnCacheSafe', filterValues: ['false'] },
                { filterName: 'itemsPerGrid', filterValues: ['18'] },
                { filterName: 'neLat', filterValues: [String(coords.ne_lat)] },
                { filterName: 'neLng', filterValues: [String(coords.ne_lng)] },
                { filterName: 'swLat', filterValues: [String(coords.sw_lat)] },
                { filterName: 'swLng', filterValues: [String(coords.sw_lng)] },
                { filterName: 'query', filterValues: [city] },
                { filterName: 'refinementPaths', filterValues: ['/homes'] },
                { filterName: 'screenSize', filterValues: ['large'] },
                { filterName: 'tabId', filterValues: ['home_tab'] },
                { filterName: 'version', filterValues: ['1.8.3'] },
                ...(cursor ? [{ filterName: 'cursor', filterValues: [cursor] }] : []),
            ],
        },
    };

    const apiUrl = `https://www.airbnb.com/api/v3/ExploreSearch?operationName=ExploreSearch&locale=en&currency=USD&variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: 'ac7f0f9a3d3e0e3f6a3f4c' } }))}`;

    console.log(`Fetching page ${page}...`);

    let data = null;
    try {
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Airbnb-API-Key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        data = await res.json();
    } catch (e) {
        console.log(`API fetch failed on page ${page}: ${e.message}`);
        break;
    }

    // Extract listings from API response
    const sections = data?.data?.presentation?.explore?.sections?.sections || [];
    const listingSection = sections.find(s =>
        s.sectionComponentType === 'LISTINGS_WITH_MAP' ||
        s.__typename === 'ExploreListingsSection' ||
        s.items?.length > 0
    );

    const items = listingSection?.items || [];
    console.log(`Page ${page}: found ${items.length} items in API response`);

    if (items.length === 0) {
        // Try alternate path
        const allItems = sections.flatMap(s => s.items || []);
        console.log(`Alternate path found ${allItems.length} total items across all sections`);

        if (allItems.length === 0) {
            console.log('No items found, API response structure:');
            console.log(JSON.stringify(Object.keys(data?.data || {})));
            break;
        }

        for (const item of allItems) {
            const id = item?.listing?.id || item?.id;
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            const isBusinessHost = !!(
                item?.listing?.isBusinessTravel ||
                item?.listing?.isProfessionalHost ||
                item?.hostingHighlight?.hostType === 'PROFESSIONAL'
            );
            allListings.push({
                url: `https://www.airbnb.com/rooms/${id}`,
                isBusinessHostFromSearch: isBusinessHost,
            });
            if (isBusinessHost) console.log(`  ✅ Business host: /rooms/${id}`);
        }
    } else {
        for (const item of items) {
            const id = item?.listing?.id || item?.id;
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            const isBusinessHost = !!(
                item?.listing?.isBusinessTravel ||
                item?.listing?.isProfessionalHost ||
                item?.hostingHighlight?.hostType === 'PROFESSIONAL'
            );
            allListings.push({
                url: `https://www.airbnb.com/rooms/${id}`,
                isBusinessHostFromSearch: isBusinessHost,
            });
            if (isBusinessHost) console.log(`  ✅ Business host: /rooms/${id}`);
        }
    }

    console.log(`Total so far: ${allListings.length}`);

    // Get next page cursor
    const paginationInfo = data?.data?.presentation?.explore?.sections?.metadata?.paginationMetadata;
    cursor = paginationInfo?.nextCursor || null;
    if (!cursor) {
        console.log('No next cursor, stopping pagination.');
        break;
    }

    await new Promise(r => setTimeout(r, 1000));
}

const businessCount = allListings.filter(l => l.isBusinessHostFromSearch).length;
console.log(`\nTotal: ${allListings.length} listings, ${businessCount} flagged as business hosts`);

for (const listing of allListings) {
    await Actor.pushData(listing);
}

console.log(`Done! Pushed ${allListings.length} URLs to dataset.`);
await Actor.exit();

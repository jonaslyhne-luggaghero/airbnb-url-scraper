import { Actor } from 'apify';

// Tight city CENTRE coordinates — highest density of business hosts
const CITIES = {
    amsterdam:   { ne_lat: 52.3850, ne_lng:  4.9300, sw_lat: 52.3550, sw_lng:  4.8700 },
    athens:      { ne_lat: 37.9850, ne_lng: 23.7500, sw_lat: 37.9650, sw_lng: 23.7100 },
    barcelona:   { ne_lat: 41.4050, ne_lng:  2.1900, sw_lat: 41.3700, sw_lng:  2.1400 },
    berlin:      { ne_lat: 52.5400, ne_lng: 13.4300, sw_lat: 52.5000, sw_lng: 13.3700 },
    brussels:    { ne_lat: 50.8650, ne_lng:  4.3900, sw_lat: 50.8350, sw_lng:  4.3400 },
    bucharest:   { ne_lat: 44.4600, ne_lng: 26.1200, sw_lat: 44.4200, sw_lng: 26.0700 },
    budapest:    { ne_lat: 47.5200, ne_lng: 19.0800, sw_lat: 47.4800, sw_lng: 19.0200 },
    copenhagen:  { ne_lat: 55.6950, ne_lng: 12.6000, sw_lat: 55.6650, sw_lng: 12.5400 },
    dublin:      { ne_lat: 53.3550, ne_lng: -6.2300, sw_lat: 53.3300, sw_lng: -6.2700 },
    edinburgh:   { ne_lat: 55.9600, ne_lng: -3.1700, sw_lat: 55.9400, sw_lng: -3.2100 },
    florence:    { ne_lat: 43.7800, ne_lng: 11.2700, sw_lat: 43.7600, sw_lng: 11.2400 },
    frankfurt:   { ne_lat: 50.1250, ne_lng:  8.7100, sw_lat: 50.1000, sw_lng:  8.6600 },
    geneva:      { ne_lat: 46.2150, ne_lng:  6.1700, sw_lat: 46.1950, sw_lng:  6.1400 },
    hamburg:     { ne_lat: 53.5750, ne_lng:  9.9900, sw_lat: 53.5500, sw_lng:  9.9500 },
    helsinki:    { ne_lat: 60.1800, ne_lng: 24.9700, sw_lat: 60.1550, sw_lng: 24.9200 },
    lisbon:      { ne_lat: 38.7300, ne_lng: -9.1200, sw_lat: 38.7050, sw_lng: -9.1600 },
    ljubljana:   { ne_lat: 46.0650, ne_lng: 14.5200, sw_lat: 46.0450, sw_lng: 14.5000 },
    madrid:      { ne_lat: 40.4350, ne_lng: -3.6800, sw_lat: 40.4100, sw_lng: -3.7100 },
    milan:       { ne_lat: 45.4800, ne_lng:  9.2000, sw_lat: 45.4550, sw_lng:  9.1700 },
    munich:      { ne_lat: 48.1550, ne_lng: 11.5900, sw_lat: 48.1300, sw_lng: 11.5500 },
    naples:      { ne_lat: 40.8650, ne_lng: 14.2700, sw_lat: 40.8400, sw_lng: 14.2400 },
    oslo:        { ne_lat: 59.9250, ne_lng: 10.7800, sw_lat: 59.9000, sw_lng: 10.7300 },
    paris:       { ne_lat: 48.8750, ne_lng:  2.3800, sw_lat: 48.8450, sw_lng:  2.3200 },
    porto:       { ne_lat: 41.1600, ne_lng: -8.6000, sw_lat: 41.1400, sw_lng: -8.6300 },
    prague:      { ne_lat: 50.0950, ne_lng: 14.4500, sw_lat: 50.0700, sw_lng: 14.4100 },
    riga:        { ne_lat: 56.9650, ne_lng: 24.1400, sw_lat: 56.9450, sw_lng: 24.1000 },
    rome:        { ne_lat: 41.9100, ne_lng: 12.5000, sw_lat: 41.8850, sw_lng: 12.4600 },
    seville:     { ne_lat: 37.3950, ne_lng: -5.9700, sw_lat: 37.3750, sw_lng: -6.0000 },
    stockholm:   { ne_lat: 59.3400, ne_lng: 18.0900, sw_lat: 59.3150, sw_lng: 18.0500 },
    tallinn:     { ne_lat: 59.4450, ne_lng: 24.7800, sw_lat: 59.4250, sw_lng: 24.7400 },
    valencia:    { ne_lat: 39.4800, ne_lng: -0.3600, sw_lat: 39.4600, sw_lng: -0.3900 },
    venice:      { ne_lat: 45.4450, ne_lng: 12.3600, sw_lat: 45.4300, sw_lng: 12.3300 },
    vienna:      { ne_lat: 48.2200, ne_lng: 16.3900, sw_lat: 48.1950, sw_lng: 16.3500 },
    vilnius:     { ne_lat: 54.6950, ne_lng: 25.2900, sw_lat: 54.6750, sw_lng: 25.2600 },
    warsaw:      { ne_lat: 52.2450, ne_lng: 21.0300, sw_lat: 52.2200, sw_lng: 20.9900 },
    zagreb:      { ne_lat: 45.8200, ne_lng: 15.9900, sw_lat: 45.8000, sw_lng: 15.9600 },
    zurich:      { ne_lat: 47.3850, ne_lng:  8.5600, sw_lat: 47.3650, sw_lng:  8.5300 },
};

await Actor.init();

const { city, maxListings = 200 } = (await Actor.getInput()) ?? {};

if (!city) {
    console.log('No city provided in input.');
    await Actor.exit();
}

const key = city.toLowerCase().trim();
const coords = CITIES[key];

if (!coords) {
    console.log(`City "${city}" not found.`);
    await Actor.exit();
}

console.log(`Searching Airbnb listings in ${city} (max ${maxListings})...`);

const found = new Set();

// Fetch multiple pages using cursor-based pagination via item_count offset
const pagesToFetch = Math.ceil(maxListings / 18);

for (let page = 0; page < pagesToFetch && found.size < maxListings; page++) {
    const offset = page * 18;
    const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes`
        + `?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}`
        + `&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}`
        + `&zoom=14&items_offset=${offset}&section_offset=3`;

    console.log(`Fetching page ${page + 1} (offset ${offset})...`);

    try {
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        const html = await response.text();
        console.log(`Page ${page + 1} size: ${html.length} characters`);

        // Extract real listing IDs using multiple patterns
        const patterns = [
            /\/rooms\/(\d{8,19})/g,
            /"listingId"\s*:\s*"(\d{8,19})"/g,
            /"id"\s*:\s*"(\d{8,19})"/g,
            /listing_id=(\d{8,19})/g,
        ];

        let pageFound = 0;
        for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)];
            for (const m of matches) {
                if (!found.has(m[1])) {
                    found.add(m[1]);
                    pageFound++;
                }
            }
        }

        console.log(`Page ${page + 1}: found ${pageFound} new IDs (total: ${found.size})`);

        // Small delay between pages to avoid rate limiting
        if (page < pagesToFetch - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (err) {
        console.log(`Error on page ${page + 1}: ${err.message}`);
    }
}

const ids = [...found].slice(0, maxListings);
console.log(`\nTotal unique listing IDs found: ${ids.length}`);

const results = ids.map(id => ({
    id,
    url: `https://www.airbnb.com/rooms/${id}`,
    city,
}));

for (const result of results) {
    await Actor.pushData(result);
}

console.log(`Done! Pushed ${results.length} URLs to dataset.`);
await Actor.exit();

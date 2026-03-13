import { Actor } from 'apify';

const CITIES = {
    amsterdam:   { ne_lat: 52.4300, ne_lng:  4.9800, sw_lat: 52.3300, sw_lng:  4.8300 },
    athens:      { ne_lat: 37.9900, ne_lng: 23.7700, sw_lat: 37.9500, sw_lng: 23.6800 },
    barcelona:   { ne_lat: 41.4500, ne_lng:  2.2200, sw_lat: 41.3400, sw_lng:  2.0900 },
    berlin:      { ne_lat: 52.5900, ne_lng: 13.4800, sw_lat: 52.4700, sw_lng: 13.3200 },
    brussels:    { ne_lat: 50.8900, ne_lng:  4.4300, sw_lat: 50.8100, sw_lng:  4.3100 },
    bucharest:   { ne_lat: 44.4800, ne_lng: 26.1500, sw_lat: 44.3900, sw_lng: 26.0200 },
    budapest:    { ne_lat: 47.5600, ne_lng: 19.1200, sw_lat: 47.4500, sw_lng: 18.9800 },
    copenhagen:  { ne_lat: 55.7300, ne_lng: 12.6500, sw_lat: 55.6200, sw_lng: 12.4500 },
    dublin:      { ne_lat: 53.3700, ne_lng: -6.1800, sw_lat: 53.3000, sw_lng: -6.3200 },
    edinburgh:   { ne_lat: 55.9800, ne_lng: -3.1200, sw_lat: 55.9200, sw_lng: -3.2500 },
    florence:    { ne_lat: 43.7900, ne_lng: 11.2800, sw_lat: 43.7500, sw_lng: 11.2000 },
    frankfurt:   { ne_lat: 50.1500, ne_lng:  8.7300, sw_lat: 50.0800, sw_lng:  8.5900 },
    geneva:      { ne_lat: 46.2400, ne_lng:  6.2000, sw_lat: 46.1800, sw_lng:  6.1000 },
    hamburg:     { ne_lat: 53.6300, ne_lng: 10.0900, sw_lat: 53.5200, sw_lng:  9.8800 },
    helsinki:    { ne_lat: 60.2100, ne_lng: 25.0800, sw_lat: 60.1400, sw_lng: 24.8900 },
    lisbon:      { ne_lat: 38.7800, ne_lng: -9.0900, sw_lat: 38.6800, sw_lng: -9.2300 },
    ljubljana:   { ne_lat: 46.0800, ne_lng: 14.5400, sw_lat: 46.0200, sw_lng: 14.4600 },
    madrid:      { ne_lat: 40.4800, ne_lng: -3.6200, sw_lat: 40.3800, sw_lng: -3.7500 },
    milan:       { ne_lat: 45.5100, ne_lng:  9.2500, sw_lat: 45.4200, sw_lng:  9.1000 },
    munich:      { ne_lat: 48.1900, ne_lng: 11.6500, sw_lat: 48.0800, sw_lng: 11.4800 },
    naples:      { ne_lat: 40.8900, ne_lng: 14.3000, sw_lat: 40.8200, sw_lng: 14.1900 },
    oslo:        { ne_lat: 59.9800, ne_lng: 10.8500, sw_lat: 59.8800, sw_lng: 10.6500 },
    paris:       { ne_lat: 48.9000, ne_lng:  2.4200, sw_lat: 48.8100, sw_lng:  2.2200 },
    porto:       { ne_lat: 41.1800, ne_lng: -8.5600, sw_lat: 41.1200, sw_lng: -8.6700 },
    prague:      { ne_lat: 50.1200, ne_lng: 14.5200, sw_lat: 50.0300, sw_lng: 14.3200 },
    riga:        { ne_lat: 56.9900, ne_lng: 24.1800, sw_lat: 56.9200, sw_lng: 24.0500 },
    rome:        { ne_lat: 41.9400, ne_lng: 12.5500, sw_lat: 41.8500, sw_lng: 12.4000 },
    seville:     { ne_lat: 37.4200, ne_lng: -5.9200, sw_lat: 37.3500, sw_lng: -6.0200 },
    stockholm:   { ne_lat: 59.3700, ne_lng: 18.1200, sw_lat: 59.2800, sw_lng: 17.9500 },
    tallinn:     { ne_lat: 59.4700, ne_lng: 24.8200, sw_lat: 59.4000, sw_lng: 24.6800 },
    valencia:    { ne_lat: 39.5000, ne_lng: -0.3200, sw_lat: 39.4200, sw_lng: -0.4200 },
    venice:      { ne_lat: 45.4600, ne_lng: 12.3800, sw_lat: 45.4100, sw_lng: 12.2900 },
    vienna:      { ne_lat: 48.2700, ne_lng: 16.4500, sw_lat: 48.1500, sw_lng: 16.2500 },
    vilnius:     { ne_lat: 54.7300, ne_lng: 25.3200, sw_lat: 54.6500, sw_lng: 25.2000 },
    warsaw:      { ne_lat: 52.2900, ne_lng: 21.0800, sw_lat: 52.1800, sw_lng: 20.9200 },
    zagreb:      { ne_lat: 45.8500, ne_lng: 16.0500, sw_lat: 45.7700, sw_lng: 15.8900 },
    zurich:      { ne_lat: 47.4200, ne_lng:  8.6000, sw_lat: 47.3300, sw_lng:  8.4800 },
};

await Actor.init();

const { city, maxListings = 100 } = (await Actor.getInput()) ?? {};

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

console.log(`Searching Airbnb listings in ${city}...`);

// Use Airbnb's search URL with bounding box
const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?ne_lat=${coords.ne_lat}&ne_lng=${coords.ne_lng}&sw_lat=${coords.sw_lat}&sw_lng=${coords.sw_lng}&zoom=12`;

console.log(`Fetching: ${searchUrl}`);

const response = await fetch(searchUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
});

const html = await response.text();
console.log(`Page size: ${html.length} characters`);

// Extract real listing IDs — Airbnb room IDs are typically 8-19 digits
// Look for them in the JSON data embedded in the page
const patterns = [
    /\/rooms\/(\d{8,19})/g,                          // /rooms/12345678
    /"listingId"\s*:\s*"(\d{8,19})"/g,               // "listingId":"12345678"
    /"id"\s*:\s*"(\d{8,19})"\s*,\s*"__typename"\s*:\s*"Listing"/g,  // Listing type
    /listing_id=(\d{8,19})/g,                         // listing_id=12345678
];

const found = new Set();

for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    for (const m of matches) {
        found.add(m[1]);
        if (found.size >= maxListings) break;
    }
    if (found.size >= maxListings) break;
}

const ids = [...found].slice(0, maxListings);
console.log(`Found ${ids.length} valid listing IDs`);

if (ids.length === 0) {
    console.log('No listing IDs found. The page may be blocked or structured differently.');
    console.log('First 500 chars of page:', html.substring(0, 500));
}

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

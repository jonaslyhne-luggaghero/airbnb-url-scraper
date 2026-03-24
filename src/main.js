import { Actor } from 'apify';
import { PlaywrightCrawler } from '@crawlee/playwright';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const city = input.city ?? 'Copenhagen';
const maxPages = input.maxPages ?? 10;

const CITIES = {
    'Copenhagen':   { ne_lat: 55.730, ne_lng: 12.660, sw_lat: 55.630, sw_lng: 12.490 },
    'Paris':        { ne_lat: 48.950, ne_lng: 2.470,  sw_lat: 48.790, sw_lng: 2.220  },
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

const CITY_URLS = {
    'Copenhagen':  'Copenhagen--Denmark',
    'Paris':       'Paris--France',
    'Amsterdam':   'Amsterdam--Netherlands',
    'Berlin':      'Berlin--Germany',
    'Barcelona':   'Barcelona--Spain',
    'Madrid':      'Madrid--Spain',
    'Rome':        'Rome--Italy',
    'Vienna':      'Vienna--Austria',
    'Prague':      'Prague--Czech-Republic',
    'Lisbon':      'Lisbon--Portugal',
    'Brussels':    'Brussels--Belgium',
    'Stockholm':   'Stockholm--Sweden',
    'Oslo':        'Oslo--Norway',
    'Helsinki':    'Helsinki--Finland',
    'Munich':      'Munich--Germany',
    'Hamburg':     'Hamburg--Germany',
    'Warsaw':      'Warsaw--Poland',
    'Budapest':    'Budapest--Hungary',
    'Athens':      'Athens--Greece',
    'Milan':       'Milan--Italy',
    'Zurich':      'Zurich--Switzerland',
    'Dublin':      'Dublin--Ireland',
    'Edinburgh':   'Edinburgh--United-Kingdom',
    'Krakow':      'Krakow--Poland',
    'Lyon':        'Lyon--France',
    'Zagreb':      'Zagreb--Croatia',
    'Ljubljana':   'Ljubljana--Slovenia',
    'Riga':        'Riga--Latvia',
    'Tallinn':     'Tallinn--Estonia',
    'Vilnius':     'Vilnius--Lithuania',
};

const CITY_PROXY_COUNTRIES = {
    'Copenhagen': 'DK', 'Paris': 'FR', 'Amsterdam': 'NL', 'Berlin': 'DE',
    'Barcelona': 'ES', 'Madrid': 'ES', 'Rome': 'IT', 'Vienna': 'AT',
    'Prague': 'CZ', 'Lisbon': 'PT', 'Brussels': 'BE', 'Stockholm': 'SE',
    'Oslo': 'NO', 'Helsinki': 'FI', 'Munich': 'DE', 'Hamburg': 'DE',
    'Warsaw': 'PL', 'Budapest': 'HU', 'Athens': 'GR', 'Milan': 'IT',
    'Zurich': 'CH', 'Dublin': 'IE', 'Edinburgh': 'GB', 'Krakow': 'PL',
    'Lyon': 'FR', 'Zagreb': 'HR', 'Ljubljana': 'SI', 'Riga': 'LV',
    'Tallinn': 'EE', 'Vilnius': 'LT',
};

// Multi-zone definitions based on actual tourist/rental hotspot research per city.
// Each zone targets a known high-density Airbnb neighbourhood so pages are not wasted on empty suburbs.
const CITY_ZONES = {

    // PARIS — 7 arrondissement clusters (unchanged, already working well)
    'Paris': [
        { ne_lat: 48.950, ne_lng: 2.420, sw_lat: 48.880, sw_lng: 2.290 }, // NW: 16,17,8 arr
        { ne_lat: 48.950, ne_lng: 2.470, sw_lat: 48.880, sw_lng: 2.350 }, // NE: 18,19,10 arr
        { ne_lat: 48.880, ne_lng: 2.390, sw_lat: 48.830, sw_lng: 2.280 }, // W center: 7,15,6 arr
        { ne_lat: 48.880, ne_lng: 2.430, sw_lat: 48.830, sw_lng: 2.330 }, // Center: 1,2,3,4,9 arr
        { ne_lat: 48.880, ne_lng: 2.470, sw_lat: 48.830, sw_lng: 2.380 }, // E center: 11,20 arr
        { ne_lat: 48.830, ne_lng: 2.420, sw_lat: 48.790, sw_lng: 2.280 }, // SW: 14,15 arr
        { ne_lat: 48.830, ne_lng: 2.470, sw_lat: 48.790, sw_lng: 2.350 }, // SE: 12,13 arr
    ],

    // BARCELONA — 6 zones based on the real Airbnb hotspot neighbourhoods:
    // Eixample Dreta (Sagrada Família, Passeig de Gràcia, Casa Batlló) — most popular
    // Eixample Esquerra (Sant Antoni, Urgell) — trendy, growing
    // Ciutat Vella: Gothic Quarter + El Raval + Las Ramblas — most touristy
    // El Born + Barceloneta — medieval streets + beach, very high density
    // Gràcia + Parc Güell — bohemian village vibe, popular with longer stays
    // Poble Sec + Montjuïc + Sants — up-and-coming, good value rentals
    'Barcelona': [
        { ne_lat: 41.415, ne_lng: 2.185, sw_lat: 41.375, sw_lng: 2.148 }, // Eixample Dreta: Sagrada Família, Passeig de Gràcia
        { ne_lat: 41.395, ne_lng: 2.165, sw_lat: 41.365, sw_lng: 2.130 }, // Eixample Esquerra: Sant Antoni, Urgell
        { ne_lat: 41.385, ne_lng: 2.180, sw_lat: 41.355, sw_lng: 2.155 }, // Ciutat Vella: Gothic Quarter, El Raval, Las Ramblas
        { ne_lat: 41.395, ne_lng: 2.200, sw_lat: 41.370, sw_lng: 2.175 }, // El Born + Barceloneta beach
        { ne_lat: 41.430, ne_lng: 2.170, sw_lat: 41.400, sw_lng: 2.140 }, // Gràcia + Parc Güell
        { ne_lat: 41.380, ne_lng: 2.160, sw_lat: 41.345, sw_lng: 2.120 }, // Poble Sec + Montjuïc + Sants
    ],

    // ROME — 6 zones based on the real Airbnb hotspot neighbourhoods:
    // Centro Storico (Pantheon, Piazza Navona, Campo de' Fiori, Trevi) — most touristy
    // Prati + Vatican (St Peter's, Vatican Museums) — very high rental density
    // Monti + Colosseo + Termini — trendiest local neighbourhood + ancient ruins
    // Trastevere — most popular authentic neighbourhood, huge Airbnb density
    // Testaccio + Aventino — foodie hub, up-and-coming rentals
    // Piazza di Spagna + Villa Borghese + Parioli — luxury end of market
    'Rome': [
        { ne_lat: 41.905, ne_lng: 12.480, sw_lat: 41.885, sw_lng: 12.460 }, // Centro Storico: Pantheon, Navona, Trevi
        { ne_lat: 41.915, ne_lng: 12.470, sw_lat: 41.895, sw_lng: 12.445 }, // Prati + Vatican
        { ne_lat: 41.900, ne_lng: 12.510, sw_lat: 41.880, sw_lng: 12.480 }, // Monti + Colosseo + Termini
        { ne_lat: 41.890, ne_lng: 12.475, sw_lat: 41.870, sw_lng: 12.450 }, // Trastevere
        { ne_lat: 41.880, ne_lng: 12.490, sw_lat: 41.855, sw_lng: 12.460 }, // Testaccio + Aventino
        { ne_lat: 41.920, ne_lng: 12.500, sw_lat: 41.898, sw_lng: 12.470 }, // Piazza di Spagna + Borghese + Parioli
    ],

    // BERLIN — 5 zones based on the real Airbnb hotspot neighbourhoods:
    // Mitte (historic centre, Museum Island, Alexanderplatz, Hackescher Markt)
    // Prenzlauer Berg (young, trendy, highest Airbnb density in Berlin)
    // Friedrichshain + Kreuzberg (nightlife, alternative scene, very popular)
    // Charlottenburg + Wilmersdorf (upmarket west, Kurfürstendamm shopping)
    // Schöneberg + Tempelhof (LGBTQ+ hub, local neighbourhood feel)
    'Berlin': [
        { ne_lat: 52.530, ne_lng: 13.420, sw_lat: 52.505, sw_lng: 13.380 }, // Mitte: Museum Island, Alexanderplatz
        { ne_lat: 52.545, ne_lng: 13.440, sw_lat: 52.520, sw_lng: 13.405 }, // Prenzlauer Berg: highest density
        { ne_lat: 52.515, ne_lng: 13.470, sw_lat: 52.490, sw_lng: 13.430 }, // Friedrichshain + Kreuzberg
        { ne_lat: 52.510, ne_lng: 13.340, sw_lat: 52.485, sw_lng: 13.300 }, // Charlottenburg + Wilmersdorf
        { ne_lat: 52.490, ne_lng: 13.380, sw_lat: 52.465, sw_lng: 13.340 }, // Schöneberg + Tempelhof
    ],

    // AMSTERDAM — 4 zones based on the real Airbnb hotspot neighbourhoods:
    // Canal Ring + Jordaan (most iconic, highest density, UNESCO heritage)
    // De Pijp (Albert Cuyp market, trendy, very popular with tourists)
    // Centrum East: Plantage, Waterlooplein, Nieuwmarkt
    // Oud-West + Vondelpark (upmarket residential, strong rental market)
    'Amsterdam': [
        { ne_lat: 52.380, ne_lng: 4.900, sw_lat: 52.360, sw_lng: 4.870 }, // Canal Ring + Jordaan
        { ne_lat: 52.358, ne_lng: 4.910, sw_lat: 52.340, sw_lng: 4.885 }, // De Pijp: Albert Cuyp market
        { ne_lat: 52.375, ne_lng: 4.925, sw_lat: 52.358, sw_lng: 4.898 }, // Centrum East: Plantage, Nieuwmarkt
        { ne_lat: 52.370, ne_lng: 4.878, sw_lat: 52.350, sw_lng: 4.848 }, // Oud-West + Vondelpark
    ],

    // MADRID — 5 zones based on the real Airbnb hotspot neighbourhoods:
    // Centro: Sol, Gran Vía, Puerta del Sol — most touristy, highest density
    // Malasaña + Chueca — trendy, LGBTQ+, nightlife, very popular on Airbnb
    // La Latina + Lavapiés — tapas bars, authentic local vibe, up-and-coming
    // Salamanca — upmarket, luxury rentals, Serrano shopping
    // Retiro + Atocha — Prado museum, park, cultural hub
    'Madrid': [
        { ne_lat: 40.425, ne_lng: -3.695, sw_lat: 40.410, sw_lng: -3.715 }, // Centro: Sol, Gran Vía
        { ne_lat: 40.430, ne_lng: -3.695, sw_lat: 40.418, sw_lng: -3.710 }, // Malasaña + Chueca
        { ne_lat: 40.415, ne_lng: -3.705, sw_lat: 40.400, sw_lng: -3.720 }, // La Latina + Lavapiés
        { ne_lat: 40.430, ne_lng: -3.675, sw_lat: 40.415, sw_lng: -3.695 }, // Salamanca
        { ne_lat: 40.415, ne_lng: -3.680, sw_lat: 40.398, sw_lng: -3.700 }, // Retiro + Atocha
    ],

    // MILAN — 4 zones based on the real Airbnb hotspot neighbourhoods:
    // Centro + Duomo (cathedral, Galleria Vittorio Emanuele, luxury shopping)
    // Brera + Moscova (art quarter, most desirable neighbourhood)
    // Navigli + Isola (canal nightlife, up-and-coming, popular on Airbnb)
    // Porta Venezia + Buenos Aires (multicultural, lots of mid-range rentals)
    'Milan': [
        { ne_lat: 45.470, ne_lng: 9.200, sw_lat: 45.455, sw_lng: 9.180 }, // Centro + Duomo
        { ne_lat: 45.480, ne_lng: 9.195, sw_lat: 45.465, sw_lng: 9.173 }, // Brera + Moscova
        { ne_lat: 45.460, ne_lng: 9.190, sw_lat: 45.440, sw_lng: 9.165 }, // Navigli + Isola
        { ne_lat: 45.475, ne_lng: 9.215, sw_lat: 45.460, sw_lng: 9.195 }, // Porta Venezia + Buenos Aires
    ],

    // LISBON — 4 zones based on the real Airbnb hotspot neighbourhoods:
    // Alfama + Mouraria (oldest neighbourhoods, most iconic, very high density)
    // Chiado + Bairro Alto (trendy, restaurants, nightlife hub)
    // Baixa + Rossio (historic centre, most central, tourist ground zero)
    // Príncipe Real + Santos + Estrela (upmarket, boutique rentals)
    'Lisbon': [
        { ne_lat: 38.718, ne_lng: -9.123, sw_lat: 38.706, sw_lng: -9.138 }, // Alfama + Mouraria
        { ne_lat: 38.713, ne_lng: -9.138, sw_lat: 38.703, sw_lng: -9.152 }, // Chiado + Bairro Alto
        { ne_lat: 38.718, ne_lng: -9.135, sw_lat: 38.710, sw_lng: -9.148 }, // Baixa + Rossio
        { ne_lat: 38.720, ne_lng: -9.148, sw_lat: 38.708, sw_lng: -9.162 }, // Príncipe Real + Santos
    ],
};

const baseCoords = CITIES[city] || CITIES['Copenhagen'];
const zones = CITY_ZONES[city] || [baseCoords];
const citySlug = CITY_URLS[city] || encodeURIComponent(city);

console.log(`Searching ${city} across ${zones.length} zone(s), max ${maxPages} pages each...`);

const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: CITY_PROXY_COUNTRIES[city] || 'FR',
});

const seenUrls = new Set();
const seenCompanies = new Set();

const startUrls = zones.map((z, i) => ({
    url: `https://www.airbnb.com/s/${citySlug}/homes?ne_lat=${z.ne_lat}&ne_lng=${z.ne_lng}&sw_lat=${z.sw_lat}&sw_lng=${z.sw_lng}&zoom=13`,
    userData: { zoneIndex: i + 1, totalZones: zones.length },
}));

// Helper: navigate to a URL with 1 automatic retry on timeout
async function gotoWithRetry(tab, url, options, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await tab.goto(url, options);
            return;
        } catch (err) {
            if (attempt < retries && err.message.includes('Timeout')) {
                console.log(`    ⏱ Timeout on attempt ${attempt + 1}, retrying...`);
                await sleep(3000);
            } else {
                throw err;
            }
        }
    }
}

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    headless: true,
    navigationTimeoutSecs: 90,
    requestHandlerTimeoutSecs: 7200,
    maxConcurrency: 1,
    maxRequestRetries: 2,
    launchContext: {
        launchOptions: {
            args: ['--disable-gpu', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
        },
    },
    requestHandler: async ({ page, request }) => {
        const { zoneIndex, totalZones } = request.userData || { zoneIndex: 1, totalZones: 1 };
        console.log(`\n═══ Zone ${zoneIndex}/${totalZones} ═══\n`);

        let pageNum = 0;

        while (pageNum < maxPages) {
            pageNum++;
            console.log(`\n--- Page ${pageNum} ---`);
            console.log(`  URL: ${page.url().substring(0, 150)}`);

            await page.waitForSelector('a[href*="/rooms/"]', { timeout: 20000 }).catch(() => {});
            await sleep(4000);

            const businessListingUrls = await page.evaluate(() => {
                const results = [];
                const allEls = [...document.querySelectorAll('*')];
                for (const el of allEls) {
                    if (el.childNodes.length <= 3 && el.textContent?.trim() === 'Business host') {
                        let parent = el.parentElement;
                        for (let i = 0; i < 15; i++) {
                            if (!parent) break;
                            const link = parent.querySelector('a[href*="/rooms/"]');
                            if (link) {
                                const href = link.getAttribute('href');
                                const url = href.startsWith('http') ? href : `https://www.airbnb.com${href}`;
                                results.push(url.split('?')[0]);
                                break;
                            }
                            parent = parent.parentElement;
                        }
                    }
                }
                return [...new Set(results)];
            });

            const newUrls = businessListingUrls.filter(u => !seenUrls.has(u));
            console.log(`  Found ${businessListingUrls.length} business hosts, ${newUrls.length} new`);

            if (newUrls.length === 0 && pageNum > 2) {
                console.log('  No new business hosts — stopping this zone.');
                break;
            }

            for (const listingUrl of newUrls) {
                seenUrls.add(listingUrl);
                console.log(`  Processing: ${listingUrl}`);

                const context = page.context();
                const tab = await context.newPage();

                try {
                    const domain = page.url().match(/https:\/\/[^\/]+/)?.[0] || 'https://www.airbnb.com';
                    const modalUrl = `${domain}/rooms/${listingUrl.split('/rooms/')[1]}?modal=PROFESSIONAL_HOST_DETAILS`;

                    // Two-step: load listing first to establish session, then modal
                    await gotoWithRetry(tab, listingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await sleep(1500);
                    await gotoWithRetry(tab, modalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await tab.waitForSelector('[role="dialog"], [data-testid="modal-container"]', { timeout: 12000 }).catch(() => {});
                    await sleep(2000);

                    const tabTitle = await tab.title();
                    console.log(`    Tab: ${tabTitle.substring(0, 60)}`);

                    let modalText = '';
                    const selectors = ['[role="dialog"]', '[data-testid="modal-container"]', '[aria-modal="true"]'];
                    for (const sel of selectors) {
                        try {
                            const el = await tab.$(sel);
                            if (el) {
                                modalText = await tab.evaluate(el => el.innerText || '', el);
                                if (modalText.length > 50) break;
                            }
                        } catch (e) {}
                    }
                    if (!modalText || modalText.length < 50) {
                        modalText = await tab.evaluate(() => document.body.innerText || '');
                    }

                    let companyName = null, email = null, phone = null, address = null, registrationNumber = null;
                    const lines = modalText.split('\n').map(l => l.trim()).filter(Boolean);
                    for (const line of lines) {
                        const colonIdx = line.indexOf(':');
                        if (colonIdx === -1) continue;
                        const label = line.substring(0, colonIdx).trim().toLowerCase();
                        const value = line.substring(colonIdx + 1).trim();
                        if (!value) continue;
                        if (label.includes('business name') || label.includes('company') || label.includes('bedrijfsnaam') || label.includes('firmanavn') || label.includes('raison sociale') || label.includes('nom commercial')) companyName = value;
                        else if (label.includes('registration') || label.includes('kvk') || label.includes('cvr') || label.includes('rcs') || label.includes('vat') || label.includes('siren') || label.includes('siret') || label.includes('handelsregister')) registrationNumber = value;
                        else if (label.includes('email') || label === 'e-mail' || label === 'courriel' || label === 'e-mailadres') email = value;
                        else if (label.includes('phone') || label === 'telefon' || label === 'téléphone' || label === 'tél' || label.includes('mobile') || label === 'telefoonnummer') phone = value;
                        else if (label === 'address' || label === 'adresse' || label === 'adres') address = value;
                    }

                    const pageText = await tab.evaluate(() => document.body.innerText || '');
                    const ratingMatch = pageText.match(/(\d\.\d{1,2})\s*[·•]\s*[\d,]+\s*review/i)
                        || pageText.match(/Rated\s+([\d.]+)\s+out of 5/i)
                        || pageText.match(/(\d\.\d{1,2})\s*★/);
                    const starRating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                    const reviewMatch = pageText.match(/[\d.]+\s*[·•]\s*([\d,]+)\s*review/i)
                        || pageText.match(/([\d,]+)\s+reviews?/i);
                    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;

                    if ((companyName || email || phone) && !seenCompanies.has(email || companyName)) {
                        seenCompanies.add(email || companyName);
                        console.log(`    ✅ ${companyName} | ${email} | ${phone}`);
                        await Actor.pushData({
                            url: listingUrl, city, companyName, email, phone,
                            address, registrationNumber, starRating, reviewCount,
                            isBusinessHost: true, scrapedAt: new Date().toISOString(),
                        });
                    } else {
                        console.log(`    ⚠️ No details extracted`);
                    }
                } catch (err) {
                    console.log(`    ❌ Error: ${err.message.substring(0, 100)}`);
                } finally {
                    await tab.close();
                }
            }

            // PAGINATION
            console.log('  Finding next page...');
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await sleep(3000);

            const navLinks = await page.$$('nav a[href]');
            let nextLink = null;

            for (const link of navLinks) {
                const text = await link.textContent();
                if (text?.trim() === String(pageNum + 1)) {
                    nextLink = link;
                    break;
                }
            }
            if (!nextLink && navLinks.length > 0) {
                nextLink = navLinks[navLinks.length - 1];
            }

            if (!nextLink) {
                console.log('  No next page link — done with this zone.');
                break;
            }

            const linkText = await nextLink.textContent();
            console.log(`  Clicking: "${linkText?.trim()}"`);

            const firstBefore = await page.evaluate(() => {
                const l = document.querySelector('a[href*="/rooms/"]');
                return l ? l.href : '';
            });

            await nextLink.click();

            let changed = false;
            for (let i = 0; i < 20; i++) {
                await sleep(1000);
                const firstAfter = await page.evaluate(() => {
                    const l = document.querySelector('a[href*="/rooms/"]');
                    return l ? l.href : '';
                });
                if (firstAfter && firstAfter !== firstBefore) {
                    changed = true;
                    console.log('  ✅ New page loaded');
                    break;
                }
            }
            if (!changed) {
                console.log('  Page did not change — done with this zone.');
                break;
            }
            await sleep(3000);
        }

        console.log(`\nZone ${zoneIndex}/${totalZones} done!`);
    },
});

await crawler.run(startUrls);
await Actor.exit();

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
    'Porto':        { ne_lat: 41.180, ne_lng: -8.560, sw_lat: 41.130, sw_lng: -8.650 },
    'Seville':      { ne_lat: 37.420, ne_lng: -5.950, sw_lat: 37.340, sw_lng: -6.020 },
    'Florence':     { ne_lat: 43.800, ne_lng: 11.290, sw_lat: 43.750, sw_lng: 11.220 },
    'Nice':         { ne_lat: 43.730, ne_lng: 7.310,  sw_lat: 43.680, sw_lng: 7.230  },
    'Reykjavik':    { ne_lat: 64.160, ne_lng: -21.820, sw_lat: 64.110, sw_lng: -21.960 },
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
    'Porto':       'Porto--Portugal',
    'Seville':     'Seville--Spain',
    'Florence':    'Florence--Italy',
    'Nice':        'Nice--France',
    'Reykjavik':   'Reykjavik--Iceland',
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
    'Porto': 'PT', 'Seville': 'ES', 'Florence': 'IT', 'Nice': 'FR', 'Reykjavik': 'IS',
};

const CITY_ZONES = {
    // PARIS — 8 tight zones targeting the real Airbnb business host hotspots:
    // Old zones were too large and covered suburbs — these target the dense central arrondissements
    'Paris': [
        { ne_lat: 48.865, ne_lng: 2.365, sw_lat: 48.848, sw_lng: 2.338 }, // 1st+2nd: Louvre, Châtelet, Palais Royal
        { ne_lat: 48.863, ne_lng: 2.365, sw_lat: 48.850, sw_lng: 2.348 }, // 3rd+4th: Le Marais, Pompidou
        { ne_lat: 48.855, ne_lng: 2.352, sw_lat: 48.840, sw_lng: 2.328 }, // 5th+6th: Saint-Germain, Latin Quarter
        { ne_lat: 48.865, ne_lng: 2.320, sw_lat: 48.845, sw_lng: 2.295 }, // 7th: Eiffel Tower, Left Bank
        { ne_lat: 48.880, ne_lng: 2.325, sw_lat: 48.860, sw_lng: 2.295 }, // 8th: Champs-Élysées, Trocadéro
        { ne_lat: 48.888, ne_lng: 2.350, sw_lat: 48.870, sw_lng: 2.325 }, // 9th+18th: Opéra, Montmartre, Pigalle
        { ne_lat: 48.872, ne_lng: 2.380, sw_lat: 48.852, sw_lng: 2.352 }, // 10th+11th: Canal St-Martin, Bastille
        { ne_lat: 48.855, ne_lng: 2.395, sw_lat: 48.835, sw_lng: 2.360 }, // 12th+13th: Nation, Bercy, Place d'Italie
    ],
    'Barcelona': [
        { ne_lat: 41.415, ne_lng: 2.185, sw_lat: 41.375, sw_lng: 2.148 },
        { ne_lat: 41.395, ne_lng: 2.165, sw_lat: 41.365, sw_lng: 2.130 },
        { ne_lat: 41.385, ne_lng: 2.180, sw_lat: 41.355, sw_lng: 2.155 },
        { ne_lat: 41.395, ne_lng: 2.200, sw_lat: 41.370, sw_lng: 2.175 },
        { ne_lat: 41.430, ne_lng: 2.170, sw_lat: 41.400, sw_lng: 2.140 },
        { ne_lat: 41.380, ne_lng: 2.160, sw_lat: 41.345, sw_lng: 2.120 },
    ],
    'Rome': [
        { ne_lat: 41.905, ne_lng: 12.480, sw_lat: 41.885, sw_lng: 12.460 },
        { ne_lat: 41.915, ne_lng: 12.470, sw_lat: 41.895, sw_lng: 12.445 },
        { ne_lat: 41.900, ne_lng: 12.510, sw_lat: 41.880, sw_lng: 12.480 },
        { ne_lat: 41.890, ne_lng: 12.475, sw_lat: 41.870, sw_lng: 12.450 },
        { ne_lat: 41.880, ne_lng: 12.490, sw_lat: 41.855, sw_lng: 12.460 },
        { ne_lat: 41.920, ne_lng: 12.500, sw_lat: 41.898, sw_lng: 12.470 },
    ],
    'Berlin': [
        { ne_lat: 52.530, ne_lng: 13.420, sw_lat: 52.505, sw_lng: 13.380 },
        { ne_lat: 52.545, ne_lng: 13.440, sw_lat: 52.520, sw_lng: 13.405 },
        { ne_lat: 52.515, ne_lng: 13.470, sw_lat: 52.490, sw_lng: 13.430 },
        { ne_lat: 52.510, ne_lng: 13.340, sw_lat: 52.485, sw_lng: 13.300 },
        { ne_lat: 52.490, ne_lng: 13.380, sw_lat: 52.465, sw_lng: 13.340 },
    ],
    'Amsterdam': [
        { ne_lat: 52.380, ne_lng: 4.900, sw_lat: 52.360, sw_lng: 4.870 },
        { ne_lat: 52.358, ne_lng: 4.910, sw_lat: 52.340, sw_lng: 4.885 },
        { ne_lat: 52.375, ne_lng: 4.925, sw_lat: 52.358, sw_lng: 4.898 },
        { ne_lat: 52.370, ne_lng: 4.878, sw_lat: 52.350, sw_lng: 4.848 },
    ],
    'Madrid': [
        { ne_lat: 40.425, ne_lng: -3.695, sw_lat: 40.410, sw_lng: -3.715 },
        { ne_lat: 40.430, ne_lng: -3.695, sw_lat: 40.418, sw_lng: -3.710 },
        { ne_lat: 40.415, ne_lng: -3.705, sw_lat: 40.400, sw_lng: -3.720 },
        { ne_lat: 40.430, ne_lng: -3.675, sw_lat: 40.415, sw_lng: -3.695 },
        { ne_lat: 40.415, ne_lng: -3.680, sw_lat: 40.398, sw_lng: -3.700 },
    ],
    'Milan': [
        { ne_lat: 45.470, ne_lng: 9.200, sw_lat: 45.455, sw_lng: 9.180 },
        { ne_lat: 45.480, ne_lng: 9.195, sw_lat: 45.465, sw_lng: 9.173 },
        { ne_lat: 45.460, ne_lng: 9.190, sw_lat: 45.440, sw_lng: 9.165 },
        { ne_lat: 45.475, ne_lng: 9.215, sw_lat: 45.460, sw_lng: 9.195 },
    ],
    'Lisbon': [
        { ne_lat: 38.718, ne_lng: -9.123, sw_lat: 38.706, sw_lng: -9.138 },
        { ne_lat: 38.713, ne_lng: -9.138, sw_lat: 38.703, sw_lng: -9.152 },
        { ne_lat: 38.718, ne_lng: -9.135, sw_lat: 38.710, sw_lng: -9.148 },
        { ne_lat: 38.720, ne_lng: -9.148, sw_lat: 38.708, sw_lng: -9.162 },
    ],

    // PORTO — 4 zones: Ribeira, Baixa+Sé, Cedofeita+Vitória, Bonfim
    'Porto': [
        { ne_lat: 41.145, ne_lng: -8.610, sw_lat: 41.135, sw_lng: -8.625 }, // Ribeira: riverfront, Dom Luís bridge
        { ne_lat: 41.150, ne_lng: -8.605, sw_lat: 41.140, sw_lng: -8.620 }, // Baixa + Sé: Aliados, São Bento
        { ne_lat: 41.158, ne_lng: -8.615, sw_lat: 41.147, sw_lng: -8.630 }, // Cedofeita + Vitória: arts, nightlife
        { ne_lat: 41.150, ne_lng: -8.590, sw_lat: 41.138, sw_lng: -8.608 }, // Bonfim: local, up-and-coming
    ],

    // SEVILLE — 3 zones: Santa Cruz, Triana, El Arenal+Macarena
    'Seville': [
        { ne_lat: 37.395, ne_lng: -5.985, sw_lat: 37.378, sw_lng: -6.002 }, // Santa Cruz + El Centro: cathedral, Alcázar
        { ne_lat: 37.390, ne_lng: -6.000, sw_lat: 37.373, sw_lng: -6.015 }, // Triana: authentic neighbourhood
        { ne_lat: 37.408, ne_lng: -5.985, sw_lat: 37.392, sw_lng: -6.002 }, // El Arenal + Macarena
    ],

    // FLORENCE — 3 zones: Centro Storico, Oltrarno, Santa Croce
    'Florence': [
        { ne_lat: 43.775, ne_lng: 11.260, sw_lat: 43.765, sw_lng: 11.245 }, // Centro Storico: Duomo, Uffizi
        { ne_lat: 43.765, ne_lng: 11.250, sw_lat: 43.755, sw_lng: 11.235 }, // Oltrarno: Pitti Palace, San Niccolò
        { ne_lat: 43.773, ne_lng: 11.270, sw_lat: 43.763, sw_lng: 11.255 }, // Santa Croce + Sant'Ambrogio
    ],

    // NICE — 3 zones: Vieux-Nice, Promenade, Cimiez
    'Nice': [
        { ne_lat: 43.700, ne_lng: 7.285, sw_lat: 43.692, sw_lng: 7.272 }, // Vieux-Nice: old town
        { ne_lat: 43.698, ne_lng: 7.270, sw_lat: 43.690, sw_lng: 7.255 }, // Promenade des Anglais + Centre
        { ne_lat: 43.712, ne_lng: 7.270, sw_lat: 43.702, sw_lng: 7.255 }, // Cimiez + Libération
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

// Helper: navigate with 1 automatic retry on timeout
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

// FIX 1: Extract fields from modal text handling BOTH formats:
//   Format A (inline):  "Business name: ACME SRL"
//   Format B (newline): "Business name:\nACME SRL"
function extractFields(modalText) {
    let companyName = null, email = null, phone = null, address = null, registrationNumber = null;

    const lines = modalText.split('\n').map(l => l.trim()).filter(Boolean);

    // Known labels mapped to field names — order matters, check longer labels first
    const labelMap = [
        { keys: [
            // English
            'business name', 'company name',
            // French
            'raison sociale', 'nom commercial',
            // Italian
            'ragione sociale', 'denominazione',
            // Spanish
            'nombre de la empresa', 'nombre comercial', 'razón social',
            // German
            'firmenname', 'unternehmensname', 'firma',
            // Dutch
            'bedrijfsnaam',
            // Portuguese
            'nome da empresa', 'nome comercial',
            // Danish/Norwegian
            'firmanavn', 'virksomhedsnavn',
            // Swedish
            'företagsnamn',
            // Finnish
            'yrityksen nimi',
            // Polish
            'nazwa firmy',
            // Czech
            'název společnosti',
            // Hungarian
            'cégnév',
            // Greek
            'επωνυμία',
        ], field: 'companyName' },
        { keys: [
            // English
            'business registration number', 'registration number', 'company registration',
            // French
            'rcs', 'siren', 'siret', 'numéro de siret', 'numéro rcs',
            // Italian
            'partita iva', 'codice fiscale', 'numero di iscrizione',
            // Spanish
            'cif', 'nif', 'número de registro', 'número de identificación fiscal',
            // German
            'handelsregisternummer', 'handelsregister', 'steuernummer', 'ust-id',
            // Dutch
            'kvk', 'btw',
            // Portuguese
            'nif', 'nipc', 'número de registo',
            // Danish
            'cvr',
            // Swedish
            'organisationsnummer',
            // Norwegian
            'organisasjonsnummer',
            // Finnish
            'y-tunnus',
            // Polish
            'nip', 'krs',
            // Czech
            'ič', 'ico',
            // Hungarian
            'adószám', 'cégjegyzékszám',
            // Greek
            'αφμ',
            // Generic
            'vat number', 'vat',
        ], field: 'registrationNumber' },
        { keys: [
            // English/universal
            'email', 'e-mail',
            // French
            'courriel',
            // Italian
            'posta elettronica',
            // Spanish
            'correo electrónico', 'correo',
            // German
            'e-mail-adresse',
            // Dutch
            'e-mailadres',
            // Portuguese
            'correio eletrónico',
            // Swedish
            'e-postadress',
            // Norwegian/Danish
            'e-postadresse',
            // Finnish
            'sähköposti',
            // Polish
            'adres e-mail',
            // Czech
            'e-mailová adresa',
            // Hungarian
            'e-mail cím',
            // Greek
            'ηλεκτρονικό ταχυδρομείο',
        ], field: 'email' },
        { keys: [
            // English
            'phone', 'phone number', 'mobile',
            // French
            'téléphone', 'tél', 'numéro de téléphone',
            // Italian
            'telefono', 'numero di telefono',
            // Spanish
            'teléfono', 'número de teléfono',
            // German
            'telefon', 'telefonnummer', 'handynummer',
            // Dutch
            'telefoonnummer',
            // Portuguese
            'telefone', 'número de telefone',
            // Swedish
            'telefonnummer',
            // Norwegian/Danish
            'telefonnummer',
            // Finnish
            'puhelinnumero',
            // Polish
            'numer telefonu',
            // Czech
            'telefonní číslo',
            // Hungarian
            'telefonszám',
            // Greek
            'τηλέφωνο',
        ], field: 'phone' },
        { keys: [
            // English
            'address',
            // French
            'adresse',
            // Italian
            'indirizzo',
            // Spanish
            'dirección',
            // German
            'adresse', 'anschrift',
            // Dutch
            'adres',
            // Portuguese
            'morada', 'endereço',
            // Swedish
            'adress',
            // Norwegian/Danish
            'adresse',
            // Finnish
            'osoite',
            // Polish
            'adres',
            // Czech
            'adresa',
            // Hungarian
            'cím',
            // Greek
            'διεύθυνση',
        ], field: 'address' },
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const colonIdx = line.indexOf(':');

        // Format A: "Label: Value" on same line
        if (colonIdx !== -1) {
            const label = line.substring(0, colonIdx).trim().toLowerCase();
            const inlineValue = line.substring(colonIdx + 1).trim();

            for (const { keys, field } of labelMap) {
                if (keys.some(k => label.includes(k))) {
                    if (inlineValue) {
                        // Value is on the same line
                        if (field === 'companyName' && !companyName) companyName = inlineValue;
                        else if (field === 'registrationNumber' && !registrationNumber) registrationNumber = inlineValue;
                        else if (field === 'email' && !email) email = inlineValue;
                        else if (field === 'phone' && !phone) phone = inlineValue;
                        else if (field === 'address' && !address) address = inlineValue;
                    } else if (i + 1 < lines.length) {
                        // Format B: Value is on the NEXT line
                        const nextLine = lines[i + 1];
                        // Make sure next line isn't itself a label
                        const nextIsLabel = labelMap.some(({ keys: ks }) =>
                            ks.some(k => nextLine.toLowerCase().includes(k + ':') || nextLine.toLowerCase().startsWith(k))
                        );
                        if (!nextIsLabel) {
                            if (field === 'companyName' && !companyName) companyName = nextLine;
                            else if (field === 'registrationNumber' && !registrationNumber) registrationNumber = nextLine;
                            else if (field === 'email' && !email) email = nextLine;
                            else if (field === 'phone' && !phone) phone = nextLine;
                            else if (field === 'address' && !address) address = nextLine;
                        }
                    }
                    break;
                }
            }
        }
    }

    return { companyName, email, phone, address, registrationNumber };
}

// FIX 2: Detect if the tab landed on the Airbnb homepage instead of the listing
function isHomepage(text) {
    return text.includes('Start your search') && text.includes('Check in / Check out') && !text.includes('Business name');
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

                    // Step 1: load listing to establish session
                    await gotoWithRetry(tab, listingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await sleep(4000);

                    // Step 2: navigate to modal URL
                    await gotoWithRetry(tab, modalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                    // FIX 2: Wait longer for modal — up to 20s, checking every second
                    let modalText = '';
                    for (let attempt = 0; attempt < 20; attempt++) {
                        await sleep(1000);
                        const bodyText = await tab.evaluate(() => document.body.innerText || '');
                        if (bodyText.includes('Business name') || bodyText.includes('business name') ||
                            bodyText.includes('Ragione sociale') || bodyText.includes('ragione sociale')) {
                            modalText = bodyText;
                            break;
                        }
                        // If we got the homepage, bail early — no point waiting
                        if (isHomepage(bodyText)) {
                            console.log(`    ↩️ Redirected to homepage, skipping`);
                            break;
                        }
                    }

                    // If polling didn't find modal text, try dialog selectors as fallback
                    if (!modalText) {
                        const selectors = ['[role="dialog"]', '[data-testid="modal-container"]', '[aria-modal="true"]'];
                        for (const sel of selectors) {
                            try {
                                const el = await tab.$(sel);
                                if (el) {
                                    const text = await tab.evaluate(el => el.innerText || '', el);
                                    if (text.length > 50) { modalText = text; break; }
                                }
                            } catch (e) {}
                        }
                    }

                    const tabTitle = await tab.title();
                    console.log(`    Tab: ${tabTitle.substring(0, 60)}`);

                    if (!modalText || isHomepage(modalText)) {
                        console.log(`    ⚠️ No details extracted (modal did not load)`);
                    } else {
                        // FIX 1: use improved extractor handling both inline and newline formats
                        const { companyName, email, phone, address, registrationNumber } = extractFields(modalText);

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
                            console.log(`    ⚠️ No details extracted (fields not matched)`);
                        }
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

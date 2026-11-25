import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Monday 23.11.2026 at noon: most places serve lunch, so results don't depend on the day tests run.
const MONDAY_NOON = new Date('2026-11-23T12:00:00+02:00');

async function open(page: Page, path = '/') {
  await page.clock.setFixedTime(MONDAY_NOON); // freezes Date, timers keep running
  await page.goto(`/#${path}`);
}

test('browse: category + quick filters narrow the list, a card opens the place page', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { name: /paikkaa/ }).last()).toBeVisible();

  await page.getByRole('button', { name: /^Aasialainen \d+ paikkaa/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Isompi ryhmä' }).click(); // → 5 hlö
  await page.getByRole('button', { name: /Matka/ }).click(); // ≤ 3
  await page.getByRole('button', { name: /≤ 3 min/ }).click(); // ≤ 5
  await expect(page.getByRole('button', { name: /≤ 5 min/ })).toBeVisible();

  const results = page.locator('section[aria-live] li');
  const n = await results.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(46);

  const firstName = await results.first().getByRole('link').first().innerText();
  await results.first().getByRole('link').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(firstName.replace('♥', '').trim());
  await expect(page.getByText('Lounasajat', { exact: false })).toBeVisible();
});

test('empty state appears and "Tyhjennä" restores the list', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^Suodattimet/ }).click();
  await page.getByText('Vain suosikit ♥').click(); // tap the label, like a user
  await expect(page.getByRole('switch', { name: /Vain suosikit/ })).toBeChecked();
  await page.getByRole('button', { name: /Näytä 0 paikkaa/ }).click();
  await expect(page.getByText('Ei osumia näillä suodattimilla')).toBeVisible();
  await page.getByRole('button', { name: 'Tyhjennä' }).last().click();
  await expect(page.getByRole('heading', { name: /\d+ paikkaa/ })).not.toHaveText('0 paikkaa');
});

test('visits and notes are saved on the phone and survive a reload', async ({ page }) => {
  await open(page, '/paikka/ravintola-malika');
  await page.getByRole('button', { name: '+1 Kävimme' }).click();
  await expect(page.getByText('Käyty 1 kerran')).toBeVisible();

  await page.getByRole('button', { name: 'Peru' }).click(); // undo
  await expect(page.getByText('Ei vielä käyty')).toBeVisible();
  await page.getByRole('button', { name: '+1 Kävimme' }).click();

  await page.getByRole('button', { name: '+ Lisää' }).click();
  await page.getByRole('radio', { name: '4 / 5' }).click();
  await page.getByRole('textbox').fill('Lammascurry hyvä, mene ennen 11.30');
  await page.getByRole('button', { name: 'Hyvä hinta' }).click();
  await page.getByRole('button', { name: 'Tallenna' }).click();

  await page.reload();
  await expect(page.getByText('Lammascurry hyvä, mene ennen 11.30')).toBeVisible();
  await expect(page.getByText('Käyty 1 kerran')).toBeVisible();

  await page.getByRole('link', { name: /Omat/ }).click();
  await expect(page.getByText('Eniten käydyt')).toBeVisible();
  await expect(page.getByText('1. Ravintola Malika')).toBeVisible();
});

test('random pick: "Mennään!" logs a visit', async ({ page }) => {
  await open(page, '/arvo');
  const go = page.getByRole('button', { name: /Mennään/ });
  await expect(go).toBeVisible({ timeout: 5000 }); // after the ~1 s shuffle
  const picked = await page.locator('h2.font-display').innerText();
  await go.click();
  await expect(page.getByRole('heading', { name: 'Hyvää ruokahetkeä!' })).toBeVisible();

  await page.getByRole('link', { name: /Omat/ }).click();
  await expect(page.getByText(`1. ${picked}`)).toBeVisible();
});

test('backup: export, delete everything, import back', async ({ page }) => {
  await open(page, '/paikka/noodle-master');
  await page.getByRole('button', { name: '+1 Kävimme' }).click();
  await page.getByRole('button', { name: 'Lisää suosikkeihin' }).click();

  await page.getByRole('link', { name: /Omat/ }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Lataa varmuuskopio/ }).click()]);
  const file = await download.path();
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(backup.app).toBe('lounasapp');
  expect(backup.visits).toHaveLength(1);

  page.on('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Poista kaikki omat tiedot' }).click();
  await expect(page.getByText(/Ei vielä omia tietoja/)).toBeVisible();

  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByText('1. Noodle Master')).toBeVisible();
  await expect(page.getByText('♥ Suosikit')).toBeVisible();
});

test('map: markers render and tapping Kauppahalli lists its places', async ({ page }) => {
  await open(page, '/kartta');
  const kauppahalli = page.getByRole('button', { name: 'Kauppahalli', exact: true });
  await expect(kauppahalli).toBeVisible({ timeout: 15_000 });
  await kauppahalli.click();
  await expect(page.getByRole('link', { name: '4 Vuodenaikaa', exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ paikkaa/).last()).toBeVisible();
});

test('random pick uses the same filters as the list, both ways', async ({ page }) => {
  await open(page, '/arvo');
  await expect(page.getByRole('button', { name: /Mennään/ })).toBeVisible({ timeout: 5000 });

  // Choose a category on the Arvo screen → it picks again from that category.
  await page.getByRole('group', { name: 'Kategoriat' }).getByRole('button', { name: /Intia & Nepal/ }).click();
  const countText = page.getByText(/Mukana \d+\/\d+ listan paikasta|Kaikki \d+ listan paikkaa mukana/);
  await expect(countText).toBeVisible();
  const listCount = (await countText.innerText()).match(/(\d+) listan/)![1];
  await expect(page.getByRole('button', { name: /Mennään/ })).toBeVisible({ timeout: 5000 });
  const picked = await page.locator('h2.font-display').innerText();
  await page.getByRole('link', { name: 'Avaa tiedot' }).click();
  await expect(page.getByText('Intia & Nepal').first()).toBeVisible();
  expect(picked.length).toBeGreaterThan(0);

  // The home list shows the same selection.
  await page.getByRole('link', { name: /Etsi/ }).click();
  await expect(page.getByRole('button', { name: /^Intia & Nepal/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('section[aria-live] h2')).toHaveText(`${listCount} paikkaa`);
});

test('starting point: preset re-measures the list, search stays inside Tampere, choice survives reload', async ({ page }) => {
  // Address search is mocked: one hit in Tampere, one in Nokia (must be dropped).
  await page.route('https://nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({
      json: [
        { osm_type: 'node', osm_id: 1, lat: '61.5038', lon: '23.7753', name: 'Tampere-talo', display_name: 'Tampere-talo', address: { suburb: 'Kalevanrinne' } },
        { osm_type: 'node', osm_id: 2, lat: '61.4789', lon: '23.5094', name: 'Nokian kirkko', display_name: 'Nokia', address: {} },
      ],
    }),
  );
  await open(page);
  const firstCard = page.locator('section[aria-live] li').first();
  const before = (await firstCard.textContent())!;

  await page.getByRole('button', { name: /Vaihda lähtöpiste, nyt Kehräsaari/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Lähtöpiste' });
  await sheet.getByRole('button', { name: 'Finlayson' }).click();
  await expect(page.getByRole('button', { name: /nyt Finlayson/ })).toBeVisible();
  await expect(firstCard).not.toHaveText(before);

  await page.getByRole('button', { name: /nyt Finlayson/ }).click();
  await sheet.getByRole('searchbox').fill('tampere-talo');
  await sheet.getByRole('button', { name: 'Hae', exact: true }).click();
  await expect(sheet.getByRole('button', { name: /Tampere-talo/ })).toBeVisible();
  await expect(sheet.getByText('Nokian kirkko')).toHaveCount(0);
  await sheet.getByRole('button', { name: /Tampere-talo/ }).click();
  await expect(page.getByRole('button', { name: /nyt Tampere-talo/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /nyt Tampere-talo/ })).toBeVisible();
  await page.getByRole('button', { name: /nyt Tampere-talo/ }).click();
  await expect(sheet.getByRole('heading', { name: 'Viimeksi käytetyt' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Palauta Kehräsaari' }).click();
  await expect(firstCard).toHaveText(before);
});

test('a mistaken visit can be removed with −1, and the removal can be undone', async ({ page }) => {
  await open(page, '/paikka/ravintola-malika');
  await page.getByRole('button', { name: '+1 Kävimme' }).click();
  await page.getByRole('button', { name: '+1 Kävimme' }).click();
  await expect(page.getByText('Käyty 2 kertaa')).toBeVisible();

  await page.getByRole('button', { name: 'Poista viimeisin käynti' }).click();
  await expect(page.getByText('Käyty 1 kerran')).toBeVisible();
  await page.getByRole('button', { name: 'Peru' }).click(); // changed my mind
  await expect(page.getByText('Käyty 2 kertaa')).toBeVisible();

  await page.getByRole('button', { name: 'Näytä käynnit (2)' }).click();
  await page.getByRole('button', { name: /^Poista käynti/ }).first().click();
  await page.getByRole('button', { name: 'Poista viimeisin käynti' }).click();
  await expect(page.getByText('Ei vielä käyty')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Poista viimeisin käynti' })).toHaveCount(0);
});

test('area: 1 km by default, can be widened to all of Tampere', async ({ page }) => {
  await open(page);
  const heading = page.locator('section[aria-live] h2');
  await expect(page.getByRole('button', { name: /nyt Kehräsaari, 1 km/ })).toBeVisible();
  const near = Number((await heading.innerText()).match(/\d+/)![0]);

  await page.getByRole('button', { name: /Vaihda lähtöpiste/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Lähtöpiste' });
  await sheet.getByRole('radiogroup', { name: 'Alue lähtöpisteestä' }).getByRole('radio', { name: 'Kaikki' }).click();
  await sheet.getByRole('button', { name: 'Sulje' }).click();

  await expect(page.getByRole('button', { name: /Koko Tampere/ })).toBeVisible();
  await expect(heading).not.toHaveText(`${near} paikkaa`);
  const all = Number((await heading.innerText()).match(/\d+/)![0]);
  expect(all).toBeGreaterThan(near + 100);
});

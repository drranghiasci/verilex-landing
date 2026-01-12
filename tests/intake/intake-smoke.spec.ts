import { expect, test, type Locator, type Page } from '@playwright/test';

const firmSlug = process.env.TEST_FIRM_SLUG ?? 'dominic-sons-legal';

const preferNoLabels = new Set([
  'Opposing Address Known',
  'Dv Present',
  'Opposing Income Known',
]);

const preferYesLabels = new Set(['Currently Cohabitating']);

async function selectFirstOption(select: Locator) {
  await select.waitFor();
  await expect
    .poll(async () => select.evaluate((el: HTMLSelectElement) => el.options.length))
    .toBeGreaterThan(1);
  await select.selectOption({ index: 1 });
}

async function fillRequiredFieldsInStep(page: Page) {
  const fields = page.locator('.stage .field');
  const count = await fields.count();
  for (let i = 0; i < count; i += 1) {
    const field = fields.nth(i);
    const required = await field.locator('.field__required').count();
    if (!required) continue;

    const label =
      (await field.locator('.field__label span').first().textContent())?.trim() ?? '';

    const toggleButtons = field.locator('.toggle__btn');
    if (await toggleButtons.count()) {
      const active = await field.locator('.toggle__btn.is-active').count();
      if (active) continue;
      const chooseNo = preferNoLabels.has(label) && !preferYesLabels.has(label);
      const target = chooseNo ? 'No' : 'Yes';
      await field.getByRole('button', { name: target }).click();
      continue;
    }

    const addressGrid = field.locator('.address-grid');
    if (await addressGrid.count()) {
      const inputs = field.locator('input');
      const values = ['123 Test St', 'Unit 1', 'Atlanta', 'GA', '30301'];
      for (let j = 0; j < (await inputs.count()); j += 1) {
        await inputs.nth(j).fill(values[j] ?? 'Test');
      }
      continue;
    }

    const selects = field.locator('select');
    if (await selects.count()) {
      for (let j = 0; j < (await selects.count()); j += 1) {
        await selectFirstOption(selects.nth(j));
      }
      continue;
    }

    const inputs = field.locator('input');
    if (await inputs.count()) {
      for (let j = 0; j < (await inputs.count()); j += 1) {
        const input = inputs.nth(j);
        const type = (await input.getAttribute('type')) ?? 'text';
        if (type === 'file') continue;
        if (type === 'checkbox') {
          if (!(await input.isChecked())) {
            await input.check();
          }
          continue;
        }
        if (type === 'date') {
          await input.fill('2000-01-01');
          continue;
        }
        if (type === 'number') {
          await input.fill('1000');
          continue;
        }
        if (type === 'tel') {
          await input.fill('555-555-5555');
          continue;
        }
        if (type === 'email') {
          await input.fill('test@example.com');
          continue;
        }

        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('email')) {
          await input.fill('test@example.com');
        } else if (lowerLabel.includes('phone')) {
          await input.fill('555-555-5555');
        } else if (lowerLabel.includes('zip')) {
          await input.fill('30301');
        } else if (lowerLabel.includes('name')) {
          await input.fill('Test Name');
        } else {
          await input.fill('Test');
        }
      }
      continue;
    }

    const textareas = field.locator('textarea');
    if (await textareas.count()) {
      for (let j = 0; j < (await textareas.count()); j += 1) {
        await textareas.nth(j).fill('Test');
      }
    }
  }
}

test('intake smoke: start → resume → submit', async ({ page, request }) => {
  const resolveResponse = await request.post('/api/intake/resolve-firm', {
    data: { firm_slug: firmSlug },
  });
  if (!resolveResponse.ok()) {
    const body = (await resolveResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      `Test firm not resolved. Set TEST_FIRM_SLUG to an existing firm slug. Details: ${
        body.error || resolveResponse.status()
      }`,
    );
  }

  await page.goto(`/intake/${firmSlug}`);
  await page.getByRole('button', { name: /start intake/i }).click();

  await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible();

  await page.waitForFunction((slug) => localStorage.getItem(`intake:token:${slug}`), firmSlug);
  const token = await page.evaluate((slug) => localStorage.getItem(`intake:token:${slug}`), firmSlug);
  expect(token).toBeTruthy();

  await page.goto(`/intake/${firmSlug}/resume/${token}`);
  await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible();

  const steps = page.locator('.steps__item');
  let stepIndex = 0;
  while (stepIndex < (await steps.count())) {
    const stepButton = steps.nth(stepIndex);
    await stepButton.click();
    await expect(stepButton).toHaveClass(/is-active/);
    await fillRequiredFieldsInStep(page);
    stepIndex += 1;
  }

  await steps.nth((await steps.count()) - 1).click();
  await expect(page.getByRole('button', { name: /submit intake/i })).toBeVisible();

  const confirmLabel = page.locator('label', {
    hasText: 'I understand submission is final and cannot be edited.',
  });
  await confirmLabel.locator('input[type="checkbox"]').check();

  await page.getByRole('button', { name: /submit intake/i }).click();
  await expect(page.getByText('Submission confirmed')).toBeVisible();
});

import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

const viewports = [
  { width: 1512, height: 982 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function mockAdminApi(page: Page) {
  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/me')) {
      await route.fulfill({ json: {
        user: { id: 'admin-test', email: 'owner@example.test' },
        permissions: ['admin'],
        apiVersion: 2,
        store: { timezone: 'Asia/Kolkata', utcOffsetMinutes: 330, currency: 'INR', lowStockThreshold: 2 },
        schema: { ready: true, missing: [] },
      } });
      return;
    }
    if (path.endsWith('/status')) {
      await route.fulfill({ json: {
        store: { timezone: 'Asia/Kolkata', currency: 'INR', lowStockThreshold: 2 },
        environment: 'development',
        integrations: {
          appwrite: { configured: true, schemaReady: true, missing: [] },
          cloudinary: { configured: false, rootFolder: 'silveram' },
          email: { configured: true },
          cashfree: { enabled: false, mode: 'sandbox' },
        },
        checkout: { live: true, cod: true, testPayments: false },
        capabilities: { refunds: false, settlements: false, courierTracking: false, partialCodCollection: false },
        adminCount: 1,
      } });
      return;
    }
    if (path.endsWith('/customers/marketing.csv')) {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="silveram-marketing-opt-ins.csv"',
          'x-export-rows': '0',
          'x-export-truncated': 'false',
        },
        body: 'Email,Name,Consent recorded at (UTC ISO),Unsubscribe URL\r\n',
      });
      return;
    }
    if (path.endsWith('/cashfree/settlements')) {
      await route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } });
      return;
    }
    if (path.endsWith('/transactions')) {
      await route.fulfill({ json: { data: [], total: 0, page: 1, limit: 50 } });
      return;
    }
    if (path.endsWith('/orders')) {
      const isDispatchCount = new URL(route.request().url()).searchParams.has('status');
      await route.fulfill({ json: { data: [], total: isDispatchCount ? 5 : 0, page: 1, limit: 25 } });
      return;
    }
    if (path.endsWith('/products') || path.endsWith('/customers')) {
      await route.fulfill({ json: { data: [], total: 0, page: 1, limit: 5 } });
      return;
    }
    await route.fulfill({ status: 404, json: { error: 'No fixture for this admin endpoint.' } });
  });
}

for (const viewport of viewports) {
  test(`shell renders at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo: TestInfo) => {
    await page.setViewportSize(viewport);
    await mockAdminApi(page);
    await page.goto('/orders');

    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    if (viewport.width < 768) {
      await expect(page.getByRole('link', { name: 'Orders open' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: 'Orders open' })).toBeVisible();
      await expect(page.locator('.sv-menu-count')).toHaveText('5');
    }
    if (viewport.width >= 768) await expect(page.locator('.sv-setup-progress')).toBeVisible();
    else await expect(page.locator('.sv-setup-progress')).toHaveCount(0);
    await expect(page.getByText('No orders yet')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      topbarHeight: Math.round(document.querySelector('.sv-topbar')!.getBoundingClientRect().height),
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.topbarHeight).toBe(48);

    await page.screenshot({
      path: testInfo.outputPath(`admin-shell-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  });
}

test('mobile navigation and the keyboard search palette work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminApi(page);
  await page.goto('/orders');

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.locator('.sv-setup-progress')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search Silveram' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search orders, products, and customers' }).fill('payments');
  await expect(page.getByRole('option', { name: /Payments/ })).toBeVisible();
});

test('legacy COD cash URL redirects to Money and keeps its query', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockAdminApi(page);
  await page.goto('/transactions/cod?view=recent');
  await expect(page).toHaveURL(/\/money\/cod\?view=recent$/);
});

test('Cashfree refund and settlement pages render their recording forms', async ({ page }, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockAdminApi(page);
  await page.goto('/money/refunds');
  await expect(page.getByRole('heading', { name: 'Cashfree refunds', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record completed refund' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /verified that this refund completed successfully/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('cashfree-refunds-desktop.png'), fullPage: true });

  await page.goto('/money/settlements');
  await expect(page.getByRole('heading', { name: 'Cashfree settlements', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save reconciliation' })).toBeVisible();
  await expect(page.getByText('Expected Cashfree payout')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('cashfree-settlements-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/money/settlements');
  await expect(page.getByRole('heading', { name: 'Cashfree settlements', exact: true })).toBeVisible();
  const width = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: testInfo.outputPath('cashfree-settlements-mobile.png'), fullPage: true });
});

test('customers can download the consent-only marketing export', async ({ page }) => {
  await mockAdminApi(page);
  await page.goto('/customers');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download opted-in contacts' }).click();
  await expect(download).resolves.toBeTruthy();
});

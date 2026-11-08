import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

let sequence = 1000;
const api = '**/api/registrations/';
async function openForm(page) {
  await page.goto('/');
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' });
  await page.getByRole('button', { name: 'Skip intro to site' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Register With Your Homie', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Assemble Your Duo' })).toBeVisible();
}
async function fillForm(page) {
  const n = ++sequence;
  await page.locator('#reg-pairname').fill(`Browser Duo ${n}`);
  for (let i = 0; i < 2; i++) {
    await page.locator(`#member-${i}-name`).fill(`Browser Player ${n} ${i}`);
    await page.locator(`#member-${i}-rollNo`).fill(`BROWSER${n}-${i}`);
    await page.locator(`#member-${i}-email`).fill(`browser${n}-${i}@example.com`);
    await page.locator(`#member-${i}-phone`).fill(String(9000000000 + n * 2 + i));
    await page.locator(`#member-${i}-dept`).fill('CSE');
  }
}
async function stubCheckout(page) {
  await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) => route.fulfill({
    contentType: 'application/javascript', body: `window.Razorpay = class {
      constructor(options) { this.options = options; window.__checkout = this; window.__checkoutCount = (window.__checkoutCount || 0) + 1; }
      on(name, handler) { this.failure = handler; }
      open() { window.__checkoutOpened = true; }
      close() { this.options.modal.ondismiss(); }
    };`,
  }));
}
async function submit(page) {
  await page.evaluate(() => { window.__checkoutOpened = false; });
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect.poll(() => page.evaluate(() => !!window.__checkoutOpened)).toBe(true);
}
async function pay(page) {
  const orderId = await page.evaluate(() => window.__checkout.options.order_id);
  const paymentId = orderId.replace(/^order_/, 'pay_');
  const proof = { razorpay_order_id: orderId, razorpay_payment_id: paymentId,
    razorpay_signature: crypto.createHmac('sha256', 'integration-test-secret').update(`${orderId}|${paymentId}`).digest('hex') };
  await page.evaluate((response) => window.__checkout.options.handler(response), proof);
}

test.beforeEach(async ({ page }) => { await stubCheckout(page); await openForm(page); });

test('registration omits the college input and payload for both participants', async ({ page }) => {
  await expect(page.locator('[id$="-college"]')).toHaveCount(0);
  await expect(page.getByLabel(/college|institution/i)).toHaveCount(0);
  await fillForm(page);
  let payload;
  await page.route(`${api}create-order`, async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 400, json: { message: 'Payload verified by test' } });
  });
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Payload verified by test' })).toBeVisible();
  expect(payload.members).toHaveLength(2);
  for (const member of payload.members) {
    expect(Object.keys(member).sort()).toEqual(['department', 'email', 'name', 'phone', 'rollNo', 'year']);
  }
});

test('required fields and registration-number uniqueness block requests', async ({ page }) => {
  let calls = 0;
  page.on('request', (req) => { if (req.url().includes('/create-order')) calls++; });
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect(page.getByText('Your duo needs a name, chief.')).toBeVisible();
  await fillForm(page);
  await page.locator('#member-1-rollNo').fill(await page.locator('#member-0-rollNo').inputValue());
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect(page.getByText('Player Two needs a different registration number.', { exact: false })).toBeVisible();
  expect(calls).toBe(0);
});

test('real UI → API → MongoDB confirmation; pending state never shows success', async ({ page, request }) => {
  await fillForm(page); await submit(page);
  await expect(page.getByRole('button', { name: 'Cooking Your Registration...' })).toBeDisabled();
  await expect(page.getByText('Duo Secured. Aura Loading.')).toHaveCount(0);
  const options = await page.evaluate(() => ({ amount: window.__checkout.options.amount, currency: window.__checkout.options.currency }));
  expect(options).toEqual({ amount: 30726, currency: 'INR' });
  const confirmation = page.waitForResponse((response) => response.url().endsWith('/verify-payment'));
  await pay(page);
  const result = await (await confirmation).json();
  await expect(page.getByText('Duo Secured. Aura Loading.')).toBeVisible();
  await expect(page.getByText(result.regCode, { exact: true })).toBeVisible();
  const status = await (await request.get(`http://127.0.0.1:5019/api/registrations/${result.registrationId}/status`)).json();
  expect(status.status).toBe('confirmed'); expect(status.members).toHaveLength(2);
});

test('cancellation and failure preserve details and reuse the same pending order', async ({ page }) => {
  let creates = 0;
  page.on('request', (req) => { if (req.url().endsWith('/create-order')) creates++; });
  await fillForm(page); await submit(page);
  await page.evaluate(() => window.__checkout.close());
  await expect(page.getByRole('alert').filter({ hasText: 'Checkout was closed' })).toBeVisible();
  await submit(page);
  await page.evaluate(() => window.__checkout.failure({ error: { description: 'Test payment declined' } }));
  await expect(page.getByRole('alert').filter({ hasText: 'Test payment declined' })).toBeVisible();
  expect(creates).toBe(1);
  await expect(page.getByText('Duo Secured. Aura Loading.')).toHaveCount(0);
  await submit(page); await pay(page);
  await expect(page.getByText('Duo Secured. Aura Loading.')).toBeVisible();
});

test('network and capacity errors never fall back to mock success', async ({ page }) => {
  await fillForm(page);
  await page.route(`${api}create-order`, (route) => route.abort());
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'internet went AFK' })).toBeInViewport();
  await page.unroute(`${api}create-order`);
  await page.route(`${api}create-order`, (route) => route.fulfill({ status: 409, json: { code: 'SOLD_OUT', message: 'Registrations are full' } }));
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "Lobby Full. You're Late to the Party." })).toBeVisible();
  await expect(page.locator('#member-0-name')).not.toHaveValue('');
  await expect(page.getByText('Duo Secured. Aura Loading.')).toHaveCount(0);
});

test('backend duplicate errors appear on the correct field', async ({ page }) => {
  await fillForm(page);
  const rollNo = await page.locator('#member-1-rollNo').inputValue();
  await page.route(`${api}create-order`, (route) => route.fulfill({ status: 409, json: { code: 'DUPLICATE_REGISTRATION', message: 'Already registered', conflicts: { rollNos: [rollNo] } } }));
  await page.getByRole('button', { name: 'Lock In the Duo' }).click();
  await expect(page.locator('#member-1-rollNo')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert').filter({ hasText: "Bro, You're Already In" })).toBeVisible();
});

test('verification failure survives reload and retries without another payment', async ({ page }) => {
  await fillForm(page); await submit(page);
  await page.route(`${api}verify-payment`, (route) => route.fulfill({ status: 503, json: { message: 'Test verification outage' } }));
  await pay(page);
  await expect(page.getByRole('button', { name: 'Retry Payment Verification' })).toBeVisible();
  await expect(page.getByText('Duo Secured. Aura Loading.')).toHaveCount(0);
  await page.unroute(`${api}verify-payment`);
  await openForm(page);
  await page.getByRole('button', { name: 'Retry Payment Verification' }).click();
  await expect(page.getByText('Duo Secured. Aura Loading.')).toBeVisible();
  expect(await page.evaluate(() => window.__checkoutCount || 0)).toBe(0);
});

test('mobile: a 200 response without server confirmation cannot show success', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fillForm(page); await submit(page);
  await page.route(`${api}verify-payment`, (route) => route.fulfill({ status: 200, json: { success: false } }));
  await pay(page);
  await expect(page.getByRole('button', { name: 'Retry Payment Verification' })).toBeVisible();
  await expect(page.getByText('Duo Secured. Aura Loading.')).toHaveCount(0);
});

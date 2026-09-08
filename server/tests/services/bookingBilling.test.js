const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('module-alias').addAlias('@', path.resolve(__dirname, '../../app'));
const mongoose = require('mongoose');
const { priceItems } = require('../../app/api/v1/services/bookingOrderService');
const billing = require('../../app/api/v1/services/bookingBillingService');
const { snapshot } = require('../../app/api/v1/services/roomPromoService');
const { Room } = require('../../app/api/v1/models');
const id = new mongoose.Types.ObjectId();
const products = [{ _id: id, price: 200, name: 'Food', stock: 5, is_available: true }];

test('server prices override forged item price and combine duplicate product quantities', () => {
    const result = priceItems(products, [{ product_id: id, price: 1, quantity: 1 }, { product_id: id, quantity: 2 }], 'percentage', 10);
    assert.equal(result.items.length, 1);
    assert.equal(result.subtotal, 600);
    assert.equal(result.discount_amount, 60);
    assert.equal(result.total, 540);
});
test('invalid quantities, foreign products, insufficient stock, and excessive discounts are rejected', () => {
    for (const quantity of [0, -1, 1.5, NaN, 6]) {
        assert.throws(() => priceItems(products, [{ product_id: id, quantity }]));
    }
    assert.throws(() => priceItems([], [{ product_id: id, quantity: 1 }]));
    assert.throws(() => priceItems(products, [{ product_id: id, quantity: 1 }], 'fixed', 201));
    assert.throws(() => priceItems(products, [{ product_id: id, quantity: 1 }], 'percentage', 101));
});
test('snapshot preserves allowance and package price when room is subsequently edited', () => {
    const room = { has_consumable_promo: true, consumable_allowance: 700, promo_name: 'Conference', promo_duration_hours: 2, promo_price: 1000 };
    const saved = snapshot(room);
    room.consumable_allowance = 50;
    assert.equal(saved.consumable_allowance, 1000);
    assert.equal(saved.promo_snapshot.promo_price, 1000);
    assert.equal(snapshot({ ...room, has_consumable_promo: false }).consumable_allowance, 0);
});
test('package covers included time and charges overtime at the saved regular rate', () => {
    const start = new Date('2026-09-08T00:00:00Z');
    const booking = { booking_type: 'online', check_in_at: start, rate_per_hour: 300,
        room_id: { rate_hour: 999 }, promo_snapshot: { promo_price: 1000, promo_duration_hours: 2 } };
    for (const [minutes, amount] of [[60, 1000], [120, 1000], [140, 1100], [165, 1300]]) {
        assert.equal(billing.calculateRoomCharge(booking, new Date(+start + minutes * 60000)).room_charge, amount);
    }
    assert.equal(billing.calculateRoomCharge({ ...booking, promo_snapshot: null }, new Date(+start + 120 * 60000)).room_charge, 600);
    assert.equal(billing.calculateRoomCharge({ ...booking, rate_per_hour: 0, promo_snapshot: null }, new Date(+start + 120 * 60000)).room_charge, 0);
});
test('room promo validation requires positive hours and allowance', async () => {
    const room = new Room({ name: 'Room', space_id: id, has_consumable_promo: true, promo_name: 'Promo', promo_duration_hours: 0, consumable_allowance: 700 });
    await assert.rejects(room.validate());
});

test('opting out of a room promo removes both the allowance and package pricing', () => {
    const room = { has_consumable_promo: true, consumable_allowance: 700, promo_price: 1000, promo_duration_hours: 2 };
    assert.deepEqual(snapshot(room, false), { consumable_allowance: 0, promo_snapshot: null });
});

test('consumable package price is charged even when no explicit old package price was saved', () => {
    const promo = snapshot({ has_consumable_promo: true, consumable_allowance: 900, promo_duration_hours: 2 });
    assert.equal(promo.promo_snapshot.promo_price, 900);
    assert.equal(promo.consumable_allowance, 900);
});
test('student and professional package prices are selected on the server', () => {
    const room = { has_consumable_promo: true, promo_duration_hours: 2,
        consumable_packages: [{ audience: 'student', price: 1000 }, { audience: 'professional', price: 1100 }] };
    assert.equal(snapshot(room, true, 'student').promo_snapshot.promo_price, 1000);
    assert.equal(snapshot(room, true, 'professional').consumable_allowance, 1100);
    assert.throws(() => snapshot(room, true, 'invalid'));
});

test('package deducts its included room portion once, leaving food credit', () => {
    const room = { has_consumable_promo: true, promo_price: 900, promo_duration_hours: 2, rate_hour: 150 };
    const saved = snapshot(room);
    assert.equal(saved.consumable_allowance, 750);
    assert.equal(saved.promo_snapshot.room_portion, 150);
    assert.equal(saved.promo_snapshot.promo_price, 900);
    assert.equal(snapshot({ ...room, promo_room_portion: 200 }).consumable_allowance, 700);
    assert.equal(snapshot({ ...room, promo_room_portion: 0 }).consumable_allowance, 900);
    for (const deduction of [-1, 900, 1000]) assert.throws(() => snapshot({ ...room, promo_room_portion: deduction }));
});
test('pax and audience select the room deduction before saving the allowance', () => {
    const room = { has_consumable_promo: true, promo_price: 900, promo_duration_hours: 2,
        hourly_rates: [{ min_pax: 1, max_pax: 5, rate_hour: 150 }, { min_pax: 6, max_pax: 10, rate_hour: 200 }] };
    assert.equal(snapshot(room, true, null, 6).consumable_allowance, 700);
    room.consumable_packages = [{ audience: 'student', price: 1000, room_portion: 200 }, { audience: 'professional', price: 1100, room_portion: 250 }];
    assert.equal(snapshot(room, true, 'student').consumable_allowance, 800);
    assert.equal(snapshot(room, true, 'professional').consumable_allowance, 850);
});

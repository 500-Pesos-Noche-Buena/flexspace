const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectRate } = require('../../app/api/v1/services/roomPricingService');
const Room = require('../../app/api/v1/models/schema/Room');
const mongoose = require('mongoose');
const room = { capacity: 10, rate_hour: 200, hourly_rates: [{ min_pax: 1, max_pax: 5, rate_hour: 150 }, { min_pax: 6, max_pax: 10, rate_hour: 180 }] };
test('guest count selects the correct range at every boundary', () => {
    for (const [count, rate] of [[1,150],[5,150],[6,180],[10,180]]) assert.equal(selectRate(room, count).rate_per_hour, rate);
    for (const count of [0, -1, 1.5, 11, 'invalid']) assert.throws(() => selectRate(room, count));
    assert.equal(selectRate({ capacity: 5, rate_hour: 100 }, 3).rate_per_hour, 100);
});
test('room validation rejects overlapping, missing and out-of-capacity pricing ranges', async () => {
    for (const hourly_rates of [
        [{ min_pax: 1, max_pax: 6, rate_hour: 150 }, { min_pax: 6, max_pax: 10, rate_hour: 180 }],
        [{ min_pax: 1, max_pax: 5, rate_hour: 150 }],
        [{ min_pax: 1, max_pax: 11, rate_hour: 150 }],
        [{ min_pax: 1, max_pax: 10, rate_hour: -1 }]
    ]) await assert.rejects(new Room({ ...room, hourly_rates, name: 'Room', space_id: new mongoose.Types.ObjectId() }).validate());
    await new Room({ ...room, name: 'Room', space_id: new mongoose.Types.ObjectId() }).validate();
});

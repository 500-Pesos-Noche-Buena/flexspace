# Room consumables and POS settlement

## Staff workflow

1. In My Spaces → edit space → add/edit room, enable **Include a consumable promo**. Enter its name, included hours, and allowance. Enter the paid package price. Student/professional variants can have different prices. Select guest ranges to configure hourly and overtime prices by pax.
2. Start a room walk-in from Walk-ins, or check in an online room booking. Promo terms are copied when the booking is created; subsequent room edits do not change that booking.
3. Click **Add consumables** on the active booking/walk-in, or open POS and select it under **Add to booking / walk-in**. Search by customer, room, or ticket. Changing branches clears the cart.
4. Add products and click **Add to room bill**. POS shows the consumed and remaining allowance and projected excess. Orders appear in Orders for preparation, with payment due at booking checkout.
5. Close the session to freeze its bill. Collect cash or verify the customer's GCash/QR transfer, then settle the booking. The receipt includes room charges, itemized orders, allowance used, excess, discounts, prior payments, and change.

The allowance applies once per session to linked order totals after POS discounts (the linked POS path currently has no additional tax). Unused credit expires. Orders without a room promo are charged in full. Cancelled/rejected orders are excluded and their stock is restored once. Once the bill is frozen, consumables cannot be added or cancelled; preparation/delivery status can still progress.

A configured package charges its full price for its included hours. Overtime follows the existing rule: the first 30 minutes of a partial hour are prorated, and more than 30 minutes rounds up to a full hour. Legacy rooms without a package price use the configured allowance as the price for new bookings. Existing booking snapshots are retained. A fixed-time walk-in uses its scheduled duration, preserving the existing billing policy.

## Backend

- `GET /api/v1/space/pos/active-sessions`: permitted active online bookings and walk-ins, with allowance summaries.
- `POST /api/v1/space/orders`: include `booking_id`, `space_id`, a stable `request_key` for retries, product IDs/quantities, and optional POS discount type/value. Server-owned product names/prices and stock are authoritative.
- Existing booking/walk-in `/calculate` and `/checkout` routes share `bookingOrderService`.
- Linked orders use `settlement_type: booking` and `payment_method: booking`. Their fulfillment status is separate from payment status. They do not create standalone payments or earnings.
- Checkout settles all included orders and creates one final booking payment and one booking earnings record. Existing deposits are deducted from the amount due. Repeated checkout returns the saved settlement.
- Final item details are snapshotted in `Booking.billing_orders`; the receipt does not depend on subsequent product edits. Revenue reports exclude linked orders from standalone POS revenue.
- Booking order creation, inventory, cancellation, bill freezing, vouchers and settlement use MongoDB transactions and write the booking revision to serialize simultaneous changes.

## Deployment requirement and limits

**MongoDB must be a replica set or sharded deployment for transactions.** MongoDB Atlas supports this. A standalone local `mongod` must be configured as a replica set before using the new flow. The app database was not modified during development/testing.

Combined booking bills currently support counter cash and staff-verified QR payments. Gateway payment links are blocked for combined bills because the legacy gateway callback does not implement shared booking settlement. Standalone POS gateway payments retain their existing behavior.

Existing bookings keep their saved allowance (or zero), and do not acquire current room promos retroactively. Previously created duplicate earnings/payments are not automatically rewritten. No data migration or production deployment was performed.

## Verification

From the repository root:

```sh
node server/tests/services/bookingBilling.test.js
npm --prefix client run build
```

For isolated transaction tests, start a disposable local MongoDB process using an empty directory, **not the application database directory**:

```sh
mkdir -p /tmp/flexspace-booking-test-db
mongod --dbpath /tmp/flexspace-booking-test-db --port 27931 --bind_ip 127.0.0.1 --replSet flexspaceBookingTest
```

In another terminal:

```sh
RUN_BOOKING_DB_TESTS=1 node --test server/tests/services/bookingFlow.integration.test.js
```

The test initializes that test replica set, creates a uniquely named test database, and deletes only its test database afterward. It covers the ₱600 → ₱800 example, exact allowance, no promo, cancellation, server pricing, insufficient stock/cash, branch access, deposits, vouchers, zero balances, duplicate requests, concurrent orders, and checkout races. Stop the disposable MongoDB process afterward.

## Booking and reporting updates

New walk-ins can opt out of the selected room's promo. Opting out snapshots zero allowance and regular hourly pricing. The booking action is labeled **Add consumables** when an allowance is included, or **Add order** otherwise.

Total Orders keeps consumable orders under their booking, including item names, order references, covered amount and excess. The POS filter includes bookings with linked POS orders. Their product value is not added a second time to transaction totals. Customer Orders identifies the room and booking ticket; its standalone revenue excludes room bills.

Earnings lists one booking settlement with the linked order references and a separate informational consumables summary. Covered product value is not extra revenue. The ledger's saved fees and net amounts are retained. CSV and PDF use all transactions matching the filters, with pagination applied only to the screen. Unpaid or cancelled standalone orders are excluded from revenue.

## Confirmed package calculation

The package price includes a room portion that is deducted from food credit once. For a ₱900 two-hour package with a ₱150 room portion, credit is ₱750. Food totaling ₱1,000 adds ₱250 excess, giving one ₱1,150 settlement within two hours. Never add the ₱150 again to the package charge. Overtime follows the saved pax hourly rate.

Add/edit room supports an included room portion for each student/professional package or a single package. A blank portion uses one hourly rate for the selected guest-count range. An explicit zero grants full-price food credit. Package price, deduction, allowance, audience and hourly rate are snapshotted for new bookings. Existing paid transactions are not rewritten.

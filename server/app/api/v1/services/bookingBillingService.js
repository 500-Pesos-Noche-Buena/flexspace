const Booking = require('@/api/v1/models/schema/Booking');
const Order = require('@/api/v1/models/schema/Order');

class BookingBillingService {

    /**
     * Calculate room/session charge using the same billing rule
     * currently used by bookingController + walkinController.
     */
    calculateRoomCharge(booking, now = new Date()) {
        const ratePerHour = parseFloat(
            booking.rate_per_hour ??
            booking.room_id?.rate_hour ??
            booking.space_id?.rate_hour ??
            0
        );

        if (!Number.isFinite(ratePerHour) || ratePerHour < 0) {
            throw new Error('Invalid hourly rate.');
        }

        let checkInTime;
        let checkOutTime;

        /*
         * WALK-IN FIXED SCHEDULE
         *
         * Your existing walk-in logic charges based on
         * start_time -> end_time when is_open_time = false.
         */
        if (
            booking.booking_type === 'walkin' &&
            !booking.is_open_time
        ) {
            if (!booking.start_time || !booking.end_time) {
                throw new Error(
                    'Missing scheduled start or end time.'
                );
            }

            checkInTime = new Date(booking.start_time);
            checkOutTime = new Date(booking.end_time);
        }

        /*
         * ONLINE BOOKING + OPEN TIME WALK-IN
         *
         * Use actual check-in/check-out.
         */
        else {
            if (!booking.check_in_at) {
                throw new Error('No check-in recorded.');
            }

            checkInTime = new Date(booking.check_in_at);

            checkOutTime = booking.check_out_at
                ? new Date(booking.check_out_at)
                : now;
        }

        if (
            Number.isNaN(checkInTime.getTime()) ||
            Number.isNaN(checkOutTime.getTime())
        ) {
            throw new Error('Invalid check-in/check-out time.');
        }

        if (checkOutTime <= checkInTime) {
            throw new Error(
                'Check-out time must be after check-in time.'
            );
        }

        const timeDiffMs = checkOutTime - checkInTime;

        const rawMinutes =
            timeDiffMs / (1000 * 60);

        const minutesSpent =
            Math.ceil(rawMinutes);

        const fullHours =
            Math.floor(minutesSpent / 60);

        const remainingMinutes =
            minutesSpent % 60;

        const perMinuteRate =
            ratePerHour / 60;

        let roomCharge = 0;
        let hoursToCharge = 0;
        let chargeType = '';

        /*
         * 1 - 30 minutes
         * prorated
         */
        if (fullHours === 0) {
            if (minutesSpent <= 30) {
                roomCharge =
                    minutesSpent * perMinuteRate;

                hoursToCharge =
                    minutesSpent / 60;

                chargeType =
                    'pro_rated_under_30m';
            }

            /*
             * 31 - 60 minutes
             * full hour
             */
            else {
                roomCharge =
                    ratePerHour;

                hoursToCharge = 1;

                chargeType =
                    'full_hour_31m_plus';
            }
        }

        /*
         * More than 1 hour
         */
        else {
            if (remainingMinutes === 0) {
                roomCharge =
                    fullHours * ratePerHour;

                hoursToCharge =
                    fullHours;

                chargeType =
                    'exact_full_hours';
            }

            /*
             * Example:
             * 1hr 20mins
             *
             * 1hr + prorated 20mins
             */
            else if (remainingMinutes <= 30) {
                roomCharge =
                    (fullHours * ratePerHour) +
                    (remainingMinutes * perMinuteRate);

                hoursToCharge =
                    fullHours +
                    (remainingMinutes / 60);

                chargeType =
                    'full_hours_plus_pro_rated';
            }

            /*
             * Example:
             * 1hr 45mins
             *
             * charged as 2 hours
             */
            else {
                roomCharge =
                    (fullHours + 1) *
                    ratePerHour;

                hoursToCharge =
                    fullHours + 1;

                chargeType =
                    'full_hours_rounded_up';
            }
        }

        // A configured package includes its duration and one allowance. Overtime
        // uses the existing rounding rule at the saved regular hourly rate.
        const promo = booking.promo_snapshot;
        if (promo?.promo_duration_hours > 0 && promo.promo_price != null) {
            const excessMinutes = Math.max(0, minutesSpent - promo.promo_duration_hours * 60);
            const whole = Math.floor(excessMinutes / 60);
            const remainder = excessMinutes % 60;
            const overtimeHours = whole + (remainder > 30 ? 1 : remainder / 60);
            roomCharge = Number(promo.promo_price) + overtimeHours * ratePerHour;
            hoursToCharge = promo.promo_duration_hours + overtimeHours;
            chargeType = 'room_promo_plus_overtime';
        }
        roomCharge = this.money(roomCharge);

        return {
            rate_per_hour: ratePerHour,

            room_charge: roomCharge,

            minutes_spent: minutesSpent,

            total_hours: hoursToCharge,

            charge_type: chargeType,

            check_in_at: checkInTime,

            check_out_at: checkOutTime,

            actual_duration: {
                hours: Math.floor(
                    timeDiffMs / 3600000
                ),

                minutes: Math.floor(
                    (timeDiffMs % 3600000) /
                    60000
                )
            }
        };
    }


    /**
     * Get ALL consumable orders attached to this booking.
     *
     * Cancelled/rejected orders DO NOT consume allowance.
     */
    async calculateConsumables(booking, session = null) {

        const orders = await Order.find({
            booking_id: booking._id,

            status: {
                $nin: [
                    'cancelled',
                    'rejected'
                ]
            }
        }).session(session).lean();

        /*
         * Use order.total instead of subtotal because
         * your POS already supports discounts/tax.
         *
         * If you want allowance to cover ORIGINAL item
         * subtotal instead, change order.total to
         * order.subtotal here.
         */
        const consumableTotal =
            orders.reduce((sum, order) => {
                return sum +
                    Number(order.total || 0);
            }, 0);


        /*
         * IMPORTANT:
         *
         * Use the allowance SNAPSHOT stored in Booking.
         *
         * Room allowance is fallback only.
         */
        const allowance =
            Number(
                booking.consumable_allowance ??
                booking.promo_snapshot?.consumable_allowance ??
                0
            );


        const coveredAmount =
            Math.min(
                consumableTotal,
                allowance
            );


        const excessAmount =
            Math.max(
                0,
                consumableTotal - allowance
            );


        const remainingAllowance =
            Math.max(
                0,
                allowance - consumableTotal
            );


        return {
            orders,

            order_count: orders.length,

            consumable_allowance:
                this.money(allowance),

            consumable_total:
                this.money(consumableTotal),

            consumable_covered:
                this.money(coveredAmount),

            consumable_excess:
                this.money(excessAmount),

            consumable_remaining:
                this.money(remainingAllowance)
        };
    }


    /**
     * MAIN FUNCTION
     *
     * Room
     * + excess consumables
     * + other charges
     * - voucher
     * = final amount
     */
    async calculateBookingBill(
        bookingOrId,
        options = {}
    ) {
        const {
            persist = false,
            checkout = false,
            now = new Date(),
            session = null
        } = options;


        let booking;

        if (
            typeof bookingOrId === 'string' ||
            bookingOrId?._bsontype === 'ObjectId'
        ) {
            booking =
                await Booking.findById(bookingOrId)
                    .populate('space_id')
                    .populate('room_id')
                    .populate('user_id');
        } else {
            booking = bookingOrId;

            /*
             * Make sure room and space are populated.
             */
            if (booking?.populate) {
                await booking.populate([
                    'space_id',
                    'room_id',
                    'user_id'
                ]);
            }
        }


        if (!booking) {
            throw new Error('Booking not found.');
        }


        /*
         * =============================
         * ROOM CHARGE
         * =============================
         */
        const room =
            this.calculateRoomCharge(
                booking,
                now
            );


        /*
         * =============================
         * CONSUMABLES
         * =============================
         */
        const consumables =
            await this.calculateConsumables(
                booking, session
            );


        /*
         * Future-safe:
         * fees, equipment, damages, etc.
         */
        const otherCharges =
            Number(
                booking.other_charges || 0
            );


        /*
         * Base amount BEFORE voucher.
         *
         * Included consumables are NOT added here.
         * Only EXCESS is charged.
         */
        const subtotal =
            room.room_charge +
            consumables.consumable_excess +
            otherCharges;


        /*
         * Existing Booking voucher support
         */
        const voucherDiscount =
            Math.max(
                0,
                Number(
                    booking.voucher_discount || 0
                )
            );


        const finalAmount =
            Math.max(
                0,
                subtotal - voucherDiscount
            );


        const result = {
            booking_id:
                booking._id,

            ticket_number:
                booking.ticket_number,

            booking_type:
                booking.booking_type,

            bookable_type:
                booking.bookable_type,


            /*
             * Room
             */
            rate_per_hour:
                room.rate_per_hour,

            room_charge:
                this.money(room.room_charge),

            total_hours:
                room.total_hours,

            charge_type:
                room.charge_type,

            actual_duration:
                room.actual_duration,


            /*
             * Consumables
             */
            consumable_allowance:
                consumables.consumable_allowance,

            consumable_total:
                consumables.consumable_total,

            consumable_covered:
                consumables.consumable_covered,

            consumable_excess:
                consumables.consumable_excess,

            consumable_remaining:
                consumables.consumable_remaining,

            order_count:
                consumables.order_count,

            orders:
                consumables.orders,


            /*
             * Other
             */
            other_charges:
                this.money(otherCharges),

            subtotal:
                this.money(subtotal),

            voucher_discount:
                this.money(voucherDiscount),

            final_amount:
                this.money(finalAmount),


            check_in_at:
                room.check_in_at,

            check_out_at:
                room.check_out_at
        };


        /*
         * Save current calculation into Booking
         */
        if (persist) {

            booking.room_charge =
                result.room_charge;

            booking.consumable_total =
                result.consumable_total;

            booking.consumable_covered =
                result.consumable_covered;

            booking.consumable_excess =
                result.consumable_excess;

            booking.other_charges =
                result.other_charges;

            booking.total_hours =
                result.total_hours;

            booking.total_amount =
                result.final_amount;


            /*
             * IMPORTANT:
             *
             * Only mark check_out_at + pending_payment
             * when user actually presses checkout.
             *
             * This allows the same service to calculate
             * a LIVE running bill in POS without ending
             * the booking.
             */
            if (checkout) {
                booking.check_out_at =
                    result.check_out_at;

                booking.status =
                    'pending_payment';

                booking.payment_status =
                    'unpaid';
            }


            booking.billing_orders = result.orders;
            const payments = await require('@/api/v1/models/schema/Payment').find({
                booking_id: booking._id, status: 'completed'
            }).session(session).lean();
            booking.amount_paid = this.money(payments.reduce((sum, payment) => sum + payment.amount_total, 0));
            booking.amount_due = this.money(Math.max(0, booking.total_amount - booking.amount_paid));
            const fields = ['room_charge', 'consumable_total', 'consumable_covered', 'consumable_excess',
                'other_charges', 'total_hours', 'total_amount', 'billing_orders', 'amount_paid', 'amount_due',
                'check_out_at', 'status', 'payment_status'];
            await Booking.updateOne({ _id: booking._id }, {
                $set: Object.fromEntries(fields.map(key => [key, booking[key]]))
            }, { session });
        }


        return result;
    }


    /**
     * Lightweight running consumable summary.
     *
     * Use this after customer orders another item.
     * Does NOT checkout the room.
     */
    async getRunningConsumableBill(
        bookingId
    ) {
        const booking =
            await Booking.findById(bookingId)
                .populate('room_id');

        if (!booking) {
            throw new Error('Booking not found.');
        }

        const consumables =
            await this.calculateConsumables(
                booking
            );

        return {
            booking_id:
                booking._id,

            ticket_number:
                booking.ticket_number,

            ...consumables
        };
    }


    money(value) {
        return Number(
            Number(value || 0)
                .toFixed(2)
        );
    }
}


module.exports =
    new BookingBillingService();
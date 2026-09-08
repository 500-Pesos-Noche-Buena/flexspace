import { describe,it,expect } from 'vitest';
import { roomHourlyRate,roomRateLabel,roomPackagePrice,roomPackageLabel,roomPackageDeduction,roomPackageCredit } from '../src/utils/roomPricing';
import { estimateBookingTotal } from '../src/utils/bookingEstimate';
import { formatNumber,formatCurrency,formatCompactNumber } from '../src/utils/formatNumber';
import { getSpaceImage,getQrImage,getImageUrl } from '../src/utils/imageHelper';
import { getBookableName,getRatePerHour,getBookableCapacity,truncateText,formatTimeToAMPM } from '../src/utils/spaceHelpers';
const room={name:'Conference',capacity:10,rate_hour:150,hourly_rates:[{min_pax:1,max_pax:5,rate_hour:150},{min_pax:6,max_pax:10,rate_hour:180}],has_consumable_promo:true,promo_duration_hours:2,consumable_packages:[{audience:'student',price:900},{audience:'professional',price:1100,room_portion:200}]};
describe('room prices and package credit',()=>{
    it.each([[1,150],[5,150],[6,180],[10,180],[11,null],[0,null]])('%i guests selects %s', (pax,rate)=>expect(roomHourlyRate(room,pax)).toBe(rate));
    it('supports old rooms and missing selection',()=>{expect(roomHourlyRate(null)).toBe(0);expect(roomHourlyRate({rate_hour:200})).toBe(200);expect(roomPackagePrice(null)).toBeNull();expect(roomPackagePrice(room,'missing')).toBeNull();});
    it('deducts the selected pax rate once and honors explicit room portions',()=>{
        expect(roomPackageCredit(room,'student',6)).toBe(720);expect(roomPackageCredit(room,'professional',6)).toBe(900);
        expect(roomPackageDeduction({...room,promo_room_portion:0},'student',1)).toBe(0);
        expect(roomRateLabel(room)).toContain('6–10 pax: ₱180');expect(roomPackageLabel(room)).toContain('student: ₱900');
    });
});
describe('booking estimates',()=>{
    const now=Date.parse('2026-09-08T04:00:00Z');
    it.each([[1,2.5],[30,75],[31,150],[60,150],[61,152.5]])('bills %i minutes as %s', (minutes,amount)=>expect(estimateBookingTotal({check_in_at:new Date(now-minutes*60000),rate_per_hour:150},now)).toBe(amount));
    it('preserves frozen totals, credits, extras, vouchers and fixed time',()=>{
        expect(estimateBookingTotal({status:'completed',total_amount:.5},now)).toBe(.5);
        expect(estimateBookingTotal({check_in_at:new Date(now-7200000),rate_per_hour:150,promo_snapshot:{promo_price:900,promo_duration_hours:2},consumable_excess:250,other_charges:50,voucher_discount:100},now)).toBe(1100);
        expect(estimateBookingTotal({booking_type:'walkin',is_open_time:false,start_time:new Date(now-3600000),end_time:new Date(now),rate_per_hour:150},now)).toBe(150);
        expect(estimateBookingTotal({check_in_at:'invalid'},now)).toBe(0);
    });
});
it('formats decimal amounts without discarding cents',()=>{expect(formatNumber('1056.67')).toBe('1,056.67');expect(formatCurrency(.5)).toBe('₱0.5');expect(formatNumber(null)).toBe('0');expect(formatNumber('bad')).toBe('0');expect(formatCompactNumber(2500)).toBe('2.5K');expect(formatCompactNumber(2e6)).toBe('2.0M');});
it('chooses room or space details and formats time',()=>{const space={name:'Hub',rate_hour:25,capacity:50};expect(getBookableName('room',room,space)).toBe('Conference');expect(getRatePerHour('space',room,space)).toBe(25);expect(getBookableCapacity('room',room,space)).toBe(10);expect(formatTimeToAMPM('00:30')).toBe('12:30 AM');expect(formatTimeToAMPM('13:10')).toBe('1:10 PM');expect(truncateText('abcdef',5)).toBe('ab...');});
it('uses image placeholders for missing media',()=>{expect(getSpaceImage(null)).toContain('placeholder');expect(getQrImage('')).toContain('placeholder');expect(getImageUrl('https://example.test/a.png')).toBe('https://example.test/a.png');});

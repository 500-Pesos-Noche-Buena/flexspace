import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import TotalOrders from '../src/pages/Space/TotalOrders/Index';
import Earnings from '../src/pages/Space/Earnings/Index';
import Dashboard from '../src/pages/Space/Dashboard/Index';
import Orders from '../src/pages/Space/Pos/Orders';
import {apiGet} from '../src/utils/Api';
vi.mock('@/utils/Api',()=>({apiGet:vi.fn(),apiPost:vi.fn(),apiPut:vi.fn(),apiDelete:vi.fn()}));
vi.mock('@/components/ui/SweetAlert2',()=>({showToast:vi.fn()}));
const order={_id:'order',order_number:'ORD-TEST',customer_name:'Test Guest',order_type:'pos',total:600,payment_method:'booking',payment_status:'paid',status:'completed',items:[{name:'Snack',price:150,quantity:4}],createdAt:'2026-09-08T04:00:00Z'};
const booking={_id:'booking',order_number:'WK-TEST',order_type:'booking',customer_name:'Test Guest',status:'completed',payment_status:'paid',payment_method:'cash',room_charge:4.17,consumable_total:600,consumable_excess:600,total:604.17,linked_orders:[order]};
const group={_id:'group',customer_name:'Test Guest',order_type:'booking',order_number:'WK-TEST',status:'completed',payment_status:'paid',payment_method:'cash',is_grouped:true,order_count:1,linked_order_count:1,total:604.17,subtotal:604.17,amount_received:700,change:95.83,grouped_orders:[booking],created_at:'2026-09-08T04:00:00Z'};
const wrap=Page=>render(<MemoryRouter><Page/></MemoryRouter>);
it('Total Orders shows both order counts and prints saved cash/change with product details',async()=>{
    apiGet.mockResolvedValue({success:true,data:{orders:[group],total:1,stats:{total:2,bookings:1,pos_orders:1,revenue:604.17}}});
    const popup={document:{write:vi.fn(),close:vi.fn()},print:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup);
    wrap(TotalOrders);await screen.findAllByText('Test Guest');
    expect(screen.getAllByText('₱604.17').length).toBeGreaterThan(0);expect(screen.getAllByText('2 order(s)').length).toBeGreaterThan(0);
    const view=screen.getAllByRole('button',{name:'View order details'})[0];fireEvent.click(view);
    fireEvent.click(await screen.findByTitle('Print Receipt'));
    expect(popup.print).toHaveBeenCalledOnce();const html=popup.document.write.mock.calls[0][0];
    expect(html).toContain('₱700.00');expect(html).toContain('₱95.83');expect(html).toContain('ORD-TEST');expect(html).toContain('4 × Snack');expect(html).not.toContain('COMBINED');
});
it('earnings displays actual collected money and linked consumable totals separately',async()=>{
    apiGet.mockResolvedValue({success:true,data:{totalRevenue:604.17,totalNetEarnings:586.04,totalPlatformFee:18.13,feePercent:3,transactionCount:1,orderCount:2,breakdown:{bookings:{revenue:604.17,netEarnings:586.04,platformFee:18.13,count:1},pos_orders:{revenue:0,count:0},consumables:{count:1,total:600,covered:0,excess:600}},transactions:[]}});
    wrap(Earnings);expect((await screen.findAllByText('₱604.17')).length).toBeGreaterThan(0);expect(screen.getByText(/2 total orders/)).toBeVisible();expect(screen.getByText(/Excess collected: ₱600.00/)).toBeVisible();
});
it('dashboard displays the combined ledger revenue and complete order count',async()=>{
    apiGet.mockImplementation(async path=>path.includes('dashboard?')?{success:true,stats:{grossRevenue:604.17,bookingRevenue:604.17,posRevenue:0,totalOrders:2,bookings:1,posOrders:1,netRevenue:586.04,platformFees:18.13,platformFeePercent:3},activeSessions:[]}:{success:false});
    wrap(Dashboard);expect((await screen.findAllByText('₱604.17')).length).toBeGreaterThan(0);await waitFor(()=>expect(screen.getByText('2')).toBeVisible());
});
it('customer orders identifies the booking and labels product value',async()=>{
    apiGet.mockResolvedValue({success:true,data:[{...order,booking_id:{_id:'booking',ticket_number:'WK-TEST',room_id:{name:'Room 1'}}}]});
    wrap(Orders);expect((await screen.findAllByText(/Booking: WK-TEST/)).length).toBeGreaterThan(0);expect(screen.getByText('Product value')).toBeVisible();expect(screen.getAllByText(/Room bill · Settled/).length).toBeGreaterThan(0);
});

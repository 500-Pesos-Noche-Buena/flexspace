import React,{useState} from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import BookingOrderSelector from '../src/components/BookingOrderSelector';
import {WalkinModal} from '../src/components/modal/WalkinModal';
import {AdminVoucherModal} from '../src/components/modal/AdminVoucherModal';
import {apiGet} from '../src/utils/Api';
vi.mock('@/utils/Api',()=>({apiGet:vi.fn()}));
const session={_id:'booking',guest_name:'Guest',ticket_number:'WK-TEST',booking_type:'walkin',is_open_time:true,check_in_at:new Date(),space_id:{name:'Hub'},consumable_total:600,consumable_allowance:750,consumable_excess:0,promo_snapshot:{promo_name:'Student promo',promo_price:900,promo_duration_hours:2,room_portion:150}};
function Selector({initial=null}){const[selected,setSelected]=useState(initial);return <BookingOrderSelector selected={selected} onSelect={setSelected} cartTotal={400}/>;}
it('selects a session and shows projected excess and the full package bill',async()=>{
    apiGet.mockResolvedValue({success:true,data:[session]});render(<MemoryRouter><Selector/></MemoryRouter>);
    await waitFor(()=>expect(screen.getByRole('combobox')).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByRole('combobox'),'booking');expect(screen.getByText('Total excess with cart: ₱250.00')).toBeVisible();expect(screen.getByText('Estimated full bill with cart: ₱1150.00')).toBeVisible();
    await userEvent.selectOptions(screen.getByRole('combobox'),'');expect(screen.queryByText('Total excess with cart: ₱250.00')).toBeNull();
});
it('searches guest names and refreshes after a failed request',async()=>{
    apiGet.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({success:true,data:[session]});render(<MemoryRouter><Selector/></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');await userEvent.click(screen.getByRole('button',{name:'Refresh'}));
    await screen.findByRole('option',{name:/Guest.*WK-TEST/});fireEvent.change(screen.getByLabelText('Search active sessions'),{target:{value:'No match'}});expect(screen.queryByRole('option',{name:/Guest.*WK-TEST/})).toBeNull();
});
it('reports a requested session that is no longer active',async()=>{
    apiGet.mockResolvedValue({success:true,data:[]});render(<MemoryRouter initialEntries={['/pos?booking_id=gone']}><Selector/></MemoryRouter>);
    expect(await screen.findByText(/no longer active/)).toBeVisible();
});
const room={_id:'room',name:'Meeting room',capacity:5,rate_hour:150,is_available:true,has_consumable_promo:true,promo_price:900,promo_duration_hours:2};
it('walk-in selection allows opting out of promo and prevents selecting an unavailable room',async()=>{
    function Form(){const[data,setData]=useState({space_id:'hub',room_id:'',name:'',is_open_time:true,guest_count:1});return <WalkinModal isOpen onClose={()=>{}} onSubmit={e=>e.preventDefault()} formData={data} setFormData={setData} spaces={[{_id:'hub',name:'Hub',rate_hour:25}]} roomsWithAvailability={[room,{...room,_id:'busy',name:'Unavailable room',is_available:false}]}/>;}
    render(<Form/>);await userEvent.click(screen.getByText('Unavailable room'));expect(screen.queryByText(/food credit ₱750.00/)).toBeNull();await userEvent.click(screen.getByText('Meeting room'));expect(screen.getByText(/food credit ₱750.00/)).toBeVisible();
    const checkboxes=screen.getAllByRole('checkbox');await userEvent.click(checkboxes[0]);expect(screen.queryByText(/food credit ₱750.00/)).toBeNull();
});
it('admin voucher rejects an empty submission and submits valid values',async()=>{
    const submit=vi.fn();render(<AdminVoucherModal isOpen onClose={()=>{}} onSubmit={submit}/>);
    await userEvent.click(screen.getByRole('button',{name:'Create Global Voucher'}));expect(submit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Voucher Code/),{target:{value:'TEST-CODE'}});fireEvent.change(screen.getByLabelText(/Discount Amount/),{target:{value:'50'}});
    await userEvent.click(screen.getByRole('button',{name:'Create Global Voucher'}));expect(submit).toHaveBeenCalledWith(expect.objectContaining({code:'TEST-CODE',discount_amount:'50'}));
});

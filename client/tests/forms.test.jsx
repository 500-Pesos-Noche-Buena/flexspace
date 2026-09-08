import React from 'react';
import { describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput,FormSelect,ValidationError } from '../src/components/FormValidation';
import RoomGuestCount from '../src/components/RoomGuestCount';
import RoomPackageChoice from '../src/components/RoomPackageChoice';
import { PaymentPanel,ReceiptScreen } from '../src/components/modal/BookingModalComponents';
vi.mock('@/utils/Api',()=>({apiPost:vi.fn()}));
vi.mock('@/components/ui/SweetAlert2',()=>({showToast:vi.fn()}));
describe('shared input validation',()=>{
    it.each([
        ['capacity','',true,'Capacity is required'],['capacity','-1',true,'cannot be negative'],
        ['capacity','1.5',true,'whole number'],['capacity','1001',true,'cannot exceed 1000'],
        ['capacity','0',true,'greater than 0'],['rate_hour','10001',true,'cannot exceed'],
        ['name','x'.repeat(51),true,'cannot exceed 50']
    ])('validates %s=%s', (name,value,required,message)=>{
        render(<FormInput label="Capacity" name={name} value={value} required={required} touched onChange={()=>{}} />);
        expect(screen.getByText(new RegExp(message))).toBeVisible();
    });
    it('allows valid decimal rates and rejects fractional capacity input',()=>{
        const onChange=vi.fn();const {rerender}=render(<FormInput label="Rate" name="rate_hour" value="" onChange={onChange}/>);
        fireEvent.change(screen.getByRole('textbox'),{target:{value:'150.50'}});expect(onChange).toHaveBeenCalledOnce();
        onChange.mockClear();rerender(<FormInput label="Capacity" name="capacity" value="" onChange={onChange}/>);
        fireEvent.change(screen.getByRole('textbox'),{target:{value:'1.5'}});expect(onChange).not.toHaveBeenCalled();
    });
    it('shows errors only after interaction and validates required selection',()=>{
        const {rerender}=render(<ValidationError touched={false} error="Required"/>);expect(screen.queryByText('Required')).toBeNull();
        rerender(<FormSelect label="District" name="district" value="" required touched onChange={()=>{}}/>);expect(screen.getByText('District is required')).toBeVisible();
    });
});
it('pax selection displays rate boundaries and reports edits',async()=>{
    const onChange=vi.fn();render(<RoomGuestCount room={{capacity:10,hourly_rates:[{min_pax:1,max_pax:5,rate_hour:150},{min_pax:6,max_pax:10,rate_hour:180}]}} value={6} onChange={onChange}/>);
    expect(screen.getByText(/Selected hourly.*180.00/)).toBeVisible();
    const input=screen.getByRole('spinbutton');expect(input).toHaveAttribute('max','10');fireEvent.change(input,{target:{value:'11'}});expect(onChange).toHaveBeenCalledWith('11');
});
it('package selection shows the room deduction and food credit',async()=>{
    const onChange=vi.fn();render(<RoomPackageChoice room={{has_consumable_promo:true,promo_duration_hours:2,rate_hour:150,consumable_packages:[{audience:'student',price:900},{audience:'professional',price:1100,room_portion:200}]}} value="student" onChange={onChange}/>);
    expect(screen.getByText(/750.00 food credit/)).toBeVisible();await userEvent.selectOptions(screen.getByRole('combobox'),'professional');expect(onChange).toHaveBeenCalledWith('professional');
});
const booking={_id:'booking',ticket_number:'WK-TEST',rate_per_hour:150,room_charge:4.17,consumable_total:600,consumable_excess:600,total_amount:604.17,billing_orders:[{_id:'order',order_number:'ORD-TEST',items:[{name:'Snack',quantity:4,price:150}]}]};
it('payment validates insufficient cash and submits the actual 700 tendered',async()=>{
    const onComplete=vi.fn();render(<PaymentPanel booking={booking} liveTotalAmount={604.17} onComplete={onComplete}/>);
    expect(screen.getByText('4 × Snack')).toBeVisible();
    const input=screen.getByRole('spinbutton');fireEvent.change(input,{target:{value:'600'}});
    const submit=screen.getByRole('button',{name:/complete|confirm|record|pay.*604/i});expect(submit).toBeDisabled();
    fireEvent.change(input,{target:{value:'700'}});expect(screen.getByText(/95.83/)).toBeVisible();await userEvent.click(submit);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({amount_received:700,total_amount:604.17,method:'cash'}));
});
it('receipt screen renders saved payment values',()=>{
    render(<ReceiptScreen booking={{...booking,status:'completed',payment:{amount_received:700,change:95.83,reference_number:'PAY-TEST'}}} onClose={()=>{}}/>);
    expect(screen.getAllByText('₱95.83').length).toBeGreaterThan(0);expect(screen.getByText('PAY-TEST')).toBeVisible();
});
it('required shared inputs expose browser validity and associated labels',()=>{
    render(<FormInput label="Guest name" name="guest_name" value="" required onChange={()=>{}}/>);
    expect(screen.getByLabelText(/Guest name/)).toBeRequired();expect(screen.getByLabelText(/Guest name/)).toBeInvalid();
});

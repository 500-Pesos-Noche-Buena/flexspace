import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Listener from '@/components/ui/OrderNotificationListener';
import Permission from '@/components/ui/NotificationPermission';
const mocks = vi.hoisted(() => ({ auth: {}, get: vi.fn(), service: Object.fromEntries(['init','setAudioEnabled','setVoiceEnabled','notifyNewOrder','notifyOrderReady','playSimpleBeep','speakMessage'].map(key => [key,vi.fn()])), toast:vi.fn() }));
vi.mock('@/context/AuthContext', () => ({useAuth:()=>mocks.auth}));
vi.mock('@/utils/Api', () => ({apiGet:mocks.get}));
vi.mock('@/services/orderNotificationService', () => ({default:mocks.service}));
vi.mock('@/components/ui/SweetAlert2', () => ({showToast:mocks.toast}));
const flush = () => act(async () => { await Promise.resolve(); });
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mocks.auth={isAuthenticated:true,user:{_id:'one',role:'space',name:'Guest'}}; mocks.get.mockResolvedValue({success:true,data:[]}); });
afterEach(() => vi.useRealTimers());
describe('order notifications', () => {
    it('does not poll for signed-out guests', async () => {
        mocks.auth={isAuthenticated:false}; const {container}=render(<Listener/>); await flush();
        expect(container).toBeEmptyDOMElement(); expect(mocks.get).not.toHaveBeenCalled();
    });
    it('alerts once for a paid confirmed order, including duplicate API rows', async () => {
        const order={order_number:'ORD-1',status:'confirmed',payment_status:'paid'};
        mocks.get.mockResolvedValue({success:true,data:[order,order,{...order,order_number:'unpaid',payment_status:'pending'}]});
        render(<Listener/>); await flush(); await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
        expect(mocks.service.notifyNewOrder).toHaveBeenCalledTimes(1);
        expect(mocks.get).toHaveBeenCalledTimes(3);
    });
    it('ignores an order response received after logout', async () => {
        let resolve; mocks.get.mockImplementation(()=>new Promise(r=>{resolve=r;}));
        const view=render(<Listener/>); mocks.auth={isAuthenticated:false}; view.rerender(<Listener/>);
        await act(async()=>resolve({success:true,data:[{order_number:'OLD',status:'confirmed',payment_status:'paid'}]}));
        expect(mocks.service.notifyNewOrder).not.toHaveBeenCalled();
    });
    it('does not overlap requests while a poll is pending', async () => {
        mocks.get.mockImplementation(()=>new Promise(()=>{})); render(<Listener/>);
        await act(async()=>{await vi.advanceTimersByTimeAsync(15000);}); expect(mocks.get).toHaveBeenCalledTimes(1);
    });
    it('alerts a customer only for ready orders and clears its interval on unmount', async () => {
        mocks.auth.user.role='user'; mocks.get.mockResolvedValue({success:true,data:{orders:[{order_number:'ready',status:'ready',total:150},{order_number:'pending',status:'pending'}]}});
        const view=render(<Listener/>); await flush(); expect(mocks.service.notifyOrderReady).toHaveBeenCalledWith({order_number:'ready',customer_name:'Guest',total:150});
        view.unmount(); const calls=mocks.get.mock.calls.length; await act(async()=>{await vi.advanceTimersByTimeAsync(10000);}); expect(mocks.get).toHaveBeenCalledTimes(calls);
    });
    it('persists sound and voice choices and previews when enabled', async () => {
        localStorage.setItem('order_notification_audio','false'); localStorage.setItem('order_notification_voice','false');
        render(<Listener/>); await flush(); fireEvent.click(screen.getByRole('button',{name:'Notification settings'}));
        fireEvent.click(screen.getByRole('button',{name:/Sound Alerts/})); fireEvent.click(screen.getByRole('button',{name:/Voice Alerts/}));
        expect(localStorage.getItem('order_notification_audio')).toBe('true'); expect(localStorage.getItem('order_notification_voice')).toBe('true');
        expect(mocks.service.playSimpleBeep).toHaveBeenCalledOnce(); expect(mocks.service.speakMessage).toHaveBeenCalledWith('Voice notifications enabled');
    });
    it('recovers from a rejected poll on the next interval', async () => {
        mocks.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({success:true,data:[]}); render(<Listener/>); await flush();
        await act(async()=>{await vi.advanceTimersByTimeAsync(5000);}); expect(mocks.get).toHaveBeenCalledTimes(2);
    });
});
describe('notification permission', () => {
    it('allows dismissal without requesting permission', () => {render(<Permission/>); fireEvent.click(screen.getByRole('button',{name:'Later'})); expect(screen.queryByText('Enable Notifications')).not.toBeInTheDocument();});
    it('recognizes already granted permission', async () => {vi.stubGlobal('Notification',{permission:'granted'}); const granted=vi.fn(); render(<Permission onPermissionGranted={granted}/>); await flush(); expect(granted).toHaveBeenCalledWith(true); expect(screen.queryByText('Enable Notifications')).not.toBeInTheDocument();});
    it.each(['granted','denied'])('handles a %s permission response', async result => {
        const notification=vi.fn(function(){}); notification.permission='default'; notification.requestPermission=vi.fn().mockResolvedValue(result); vi.stubGlobal('Notification',notification);
        const granted=vi.fn(); render(<Permission onPermissionGranted={granted}/>); await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Allow Notifications'})));
        expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({icon:result==='granted'?'success':'warning'}));
        expect(granted).toHaveBeenCalledTimes(result==='granted'?1:0);
    });
});

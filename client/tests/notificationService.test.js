import {beforeEach,it,expect,vi} from 'vitest';
let service;
beforeEach(async()=>{vi.resetModules(); service=(await import('@/services/orderNotificationService')).default;});
it('initializes safely when Web Audio is unsupported',()=>{vi.stubGlobal('AudioContext',undefined); vi.stubGlobal('webkitAudioContext',undefined); expect(()=>service.init()).not.toThrow();});
it.each(['notifyNewOrder','notifyOrderReady'])('%s works without browser notification support', method=>{
    vi.stubGlobal('Notification',undefined); vi.spyOn(service,'playSimpleBeep').mockImplementation(()=>{}); vi.spyOn(service,'speakMessage').mockImplementation(()=>{});
    expect(()=>service[method]({order_number:'1',customer_name:'Guest',total:100})).not.toThrow();
});
it.each(['notifyNewOrder','notifyOrderReady'])('%s deduplicates alerts and can reset them',method=>{
    const notification=vi.fn(function(){}); notification.permission='granted'; vi.stubGlobal('Notification',notification);
    vi.spyOn(service,'playSimpleBeep').mockImplementation(()=>{}); vi.spyOn(service,'speakMessage').mockImplementation(()=>{});
    const order={order_number:'1',customer_name:'Guest',total:100}; service[method](order); service[method](order);
    expect(notification).toHaveBeenCalledTimes(1); expect(service.playSimpleBeep).toHaveBeenCalledTimes(1);
    service.clearNotifiedOrders(); service[method](order); expect(notification).toHaveBeenCalledTimes(2);
});
it.each(['notifyNewOrder','notifyOrderReady'])('%s tolerates a blocked Notification constructor',method=>{
    const notification=vi.fn(function(){throw new Error('Unsupported');}); notification.permission='granted'; vi.stubGlobal('Notification',notification);
    vi.spyOn(service,'playSimpleBeep').mockImplementation(()=>{}); expect(()=>service[method]({order_number:'1'})).not.toThrow();
});
it('disabling voice cancels active speech and prevents new speech',()=>{
    service.speechSynth={cancel:vi.fn(),speak:vi.fn()}; service.setVoiceEnabled(false); service.speakMessage('test');
    expect(service.speechSynth.cancel).toHaveBeenCalledOnce(); expect(service.speechSynth.speak).not.toHaveBeenCalled();
});
it('speaks a configured utterance',()=>{
    vi.stubGlobal('SpeechSynthesisUtterance',function(message){this.text=message;}); service.speechSynth={cancel:vi.fn(),speak:vi.fn()}; service.speakMessage('Ready');
    expect(service.speechSynth.speak).toHaveBeenCalledWith(expect.objectContaining({text:'Ready',rate:0.95,volume:0.7}));
});
it('does not play sound when muted',()=>{service.setAudioEnabled(false); vi.spyOn(service,'playFallbackBeep'); service.playSimpleBeep(); expect(service.playFallbackBeep).not.toHaveBeenCalled();});
it('resumes suspended audio before playing',async()=>{service.audioContext={state:'suspended',resume:vi.fn().mockResolvedValue()}; vi.spyOn(service,'playBeepSound').mockImplementation(()=>{}); service.playSimpleBeep(); await Promise.resolve(); expect(service.playBeepSound).toHaveBeenCalledOnce();});
it('plays a short tone through an active audio context',()=>{
    const oscillator={connect:vi.fn(),frequency:{},start:vi.fn(),stop:vi.fn()}; const gain={connect:vi.fn(),gain:{exponentialRampToValueAtTime:vi.fn()}};
    service.audioContext={state:'running',createOscillator:()=>oscillator,createGain:()=>gain,currentTime:1,destination:{}};
    service.playSimpleBeep(); expect(oscillator.frequency.value).toBe(880); expect(oscillator.stop).toHaveBeenCalledWith(1.3);
});

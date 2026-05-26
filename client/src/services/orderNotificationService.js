class OrderNotificationService {
    constructor() {
        this.speechSynth = null;
        this.isAudioEnabled = true;
        this.isVoiceEnabled = true;
        this.notifiedOrders = new Set();
        this.notifiedStatusChanges = new Set();
        this.audioContext = null;
        this.isAudioInitialized = false;
    }

    init() {
        // Initialize speech synthesis
        if (typeof window !== 'undefined') {
            this.speechSynth = window.speechSynthesis;
            
            // Initialize AudioContext on user gesture
            this.setupAudioContext();
        }
    }

    setupAudioContext() {
        // Create AudioContext but keep it suspended
        if (typeof window !== 'undefined' && !this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Add event listeners for user interaction
            const resumeAudio = () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('AudioContext resumed');
                        this.isAudioInitialized = true;
                    }).catch(e => console.warn('Failed to resume AudioContext:', e));
                }
            };
            
            // Resume on any user interaction
            window.addEventListener('click', resumeAudio, { once: true });
            window.addEventListener('touchstart', resumeAudio, { once: true });
            window.addEventListener('keydown', resumeAudio, { once: true });
        }
    }

    playSimpleBeep() {
        if (!this.isAudioEnabled) return;
        
        // If AudioContext is not initialized or suspended, try to resume
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.playBeepSound();
            }).catch(e => console.warn('Could not resume AudioContext:', e));
        } else if (this.audioContext && this.audioContext.state === 'running') {
            this.playBeepSound();
        } else {
            // Fallback for browsers that don't support Web Audio
            this.playFallbackBeep();
        }
    }
    
    playBeepSound() {
        try {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.2;
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.3);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            console.warn('Could not play beep sound:', e);
            this.playFallbackBeep();
        }
    }
    
    playFallbackBeep() {
        try {
            // Try using a simple Audio element with a data URL
            const audio = new Audio();
            audio.volume = 0.2;
            // Simple beep using Web Audio data URL (silent fallback)
            audio.src = 'data:audio/wav;base64,U3RlYWx0aCBiZWVwIHNvdW5k';
            audio.play().catch(() => {});
        } catch (err) {
            console.warn('Could not play fallback sound');
        }
    }

    speakMessage(message) {
        if (!this.isVoiceEnabled || !this.speechSynth) return;
        
        try {
            // Cancel any ongoing speech
            this.speechSynth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 0.7;
            
            this.speechSynth.speak(utterance);
        } catch (e) {
            console.warn('Could not speak message:', e);
        }
    }

    // For Space Owner/Staff - New order notification
    notifyNewOrder(order) {
        if (this.notifiedOrders.has(order.order_number)) return;
        
        this.playSimpleBeep();
        this.notifiedOrders.add(order.order_number);
        
        const message = `New order from ${order.customer_name}. Total ₱${order.total}.`;
        this.speakMessage(message);
        
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification('🛒 New Order!', {
                body: `${order.customer_name} placed an order worth ₱${order.total}`,
                icon: '/favicon.ico',
                tag: `order-${order.order_number}`
            });
        }
    }

    // For User - Order ready for pickup notification
    notifyOrderReady(order) {
        const statusKey = `${order.order_number}-ready`;
        
        if (this.notifiedStatusChanges.has(statusKey)) return;
        
        this.playSimpleBeep();
        this.notifiedStatusChanges.add(statusKey);
        
        const message = `Hello ${order.customer_name}, your order is ready for pickup! Please come to the counter.`;
        this.speakMessage(message);
        
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification('📦 Order Ready for Pickup!', {
                body: `Your order #${order.order_number} is ready. Please come to the counter.`,
                icon: '/favicon.ico',
                tag: `order-${order.order_number}-ready`
            });
        }
    }

    setAudioEnabled(enabled) {
        this.isAudioEnabled = enabled;
    }

    setVoiceEnabled(enabled) {
        this.isVoiceEnabled = enabled;
        if (!enabled && this.speechSynth) {
            this.speechSynth.cancel();
        }
    }
    
    clearNotifiedOrders() {
        this.notifiedOrders.clear();
        this.notifiedStatusChanges.clear();
    }
}

export default new OrderNotificationService();
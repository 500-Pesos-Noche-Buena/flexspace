import { useEffect, useRef } from 'react';

const DevConsoleDetector = () => {
    const warningShown = useRef(false);

    useEffect(() => {
        const showWarning = () => {
            if (warningShown.current) return;
            warningShown.current = true;

            console.clear();

            const styles = {
                header: 'color: #ff0000; font-size: 48px; font-weight: bold; -webkit-text-stroke: 2px #000000;',
                warning: 'color: #ff6600; font-size: 18px; font-weight: bold;',
                scam: 'color: #ff0000; font-size: 20px; font-weight: bold;',
                normal: 'color: #4f46e5; font-size: 14px;',
                security: 'color: #00ff00; font-size: 14px;'
            };

            console.log('%c🚨 STOP! DO NOT PASTE ANYTHING HERE! 🚨', styles.header);
            console.log('%c⚠️ This is a browser developer tool.', styles.warning);
            console.log('%c⚠️ If someone told you to paste code here, it is a SCAM!', styles.scam);
            console.log('%c⚠️ They will try to steal your account and personal information.', styles.scam);
            console.log('%c✅ FlexSpace will NEVER ask you to paste code in console.', styles.normal);
            console.log('%c✅ Close this console to continue safely.', styles.security);
            console.log('%c🔒 Your security is our priority.', styles.normal);

            // Optional: Breakpoint to pause execution
            // debugger;
        };

        // Method 1: Detect using debugger interval
        let detectionInterval;
        const startDetection = () => {
            let consoleOpened = false;
            detectionInterval = setInterval(() => {
                const startTime = new Date().getTime();
                debugger;
                const endTime = new Date().getTime();

                if (endTime - startTime > 100) {
                    if (!consoleOpened) {
                        consoleOpened = true;
                        showWarning();
                    }
                } else {
                    consoleOpened = false;
                }
            }, 2000);
        };

        // Method 2: Override console methods
        const originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };

        const overrideConsole = () => {
            Object.keys(originalConsole).forEach(method => {
                console[method] = function () {
                    showWarning();
                    originalConsole[method].apply(console, arguments);
                };
            });
        };

        // Method 3: Detect via window size (console often changes viewport)
        let lastHeight = window.innerHeight;
        let lastWidth = window.innerWidth;

        const detectResize = () => {
            const newHeight = window.innerHeight;
            const newWidth = window.innerWidth;

            // Significant height change often indicates dev console
            if (Math.abs(newHeight - lastHeight) > 100 || Math.abs(newWidth - lastWidth) > 100) {
                showWarning();
            }

            lastHeight = newHeight;
            lastWidth = newWidth;
        };

        // Start all detection methods
        startDetection();
        overrideConsole();
        window.addEventListener('resize', detectResize);

        // Cleanup
        return () => {
            if (detectionInterval) clearInterval(detectionInterval);
            window.removeEventListener('resize', detectResize);

            // Restore original console methods
            Object.keys(originalConsole).forEach(method => {
                console[method] = originalConsole[method];
            });
        };
    }, []);

    return null;
};

export default DevConsoleDetector;
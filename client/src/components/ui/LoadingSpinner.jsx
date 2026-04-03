import React from 'react';

/**
 * LoadingSpinner Component
 *
 * @param {('spinner'|'dots'|'ring'|'ball'|'bars'|'infinity')} type - The style of the loader (daisyUI). Defaults to 'spinner'.
 * @param {('loading-xs'|'loading-sm'|'loading-md'|'loading-lg')} size - The size of the loader. Defaults to 'loading-lg'.
 * @param {boolean} fullPage - If true, renders a fixed, full-screen overlay. Defaults to false.
 * @param {string} message - The text to display below the spinner. Defaults based on 'fullPage'.
 */
export const LoadingSpinner = ({ 
    type = 'spinner', 
    size = 'loading-lg', 
    fullPage = false,
    message = fullPage ? 'Initializing application...' : 'Loading...', 
}) => {
    
    const loadingClass = `loading loading-${type} ${size} text-primary`;

    if (fullPage) {
        return (
            <div className="fixed inset-0 z-9999 flex items-center justify-center bg-base-100/70 backdrop-blur-md transition-opacity duration-300">
                <div 
                    className="bg-base-200 p-12 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 
                        transform transition duration-500 ease-out animate-fade-in-scale" 
                >
                    <span className={loadingClass} role="status" aria-label={message}></span>
                    <p className="text-lg font-semibold text-base-content/90">
                        {message}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <span 
            className={`flex justify-center items-center ${loadingClass}`} 
            role="status" 
            aria-label={message}
        ></span>
    );
};
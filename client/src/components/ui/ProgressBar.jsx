import React from 'react';

/**
 * ProgressBar Component
 *
 * Displays task or upload progress using the daisyUI progress component.
 *
 * @param {number} value - The current progress value (0 to 100).
 * @param {number} max - The maximum value the progress bar can reach. Defaults to 100.
 * @param {('progress-primary'|'progress-secondary'|...)} color - The color theme for the progress bar. Defaults to 'progress-primary'.
 * @param {string} className - Optional: Additional classes for styling the container.
 */
export const ProgressBar = ({ 
    value, 
    max = 100, 
    color = 'progress-primary', 
    className = '' 
}) => {
    
    const progressPercentage = Math.round((value / max) * 100);
    
    return (
        <div className={`w-full ${className}`}>
            
            {/* The daisyUI progress bar component */}
            <progress
                className={`progress ${color} w-full transition-all duration-500`}
                value={value}
                max={max}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin="0"
                aria-valuemax={max}
                aria-label={`Progress: ${progressPercentage}% complete`}
            />

            {/* Display the progress percentage below the bar for clarity */}
            <div className="flex justify-between text-sm mt-1 text-base-content/70">
                <span>
                    Progress
                </span>
                <span className="font-semibold text-primary">
                    {progressPercentage}%
                </span>
            </div>
        </div>
    );
};

// --- Example Usage Guide (as a comment for quick reference) ---
/*
// 1. Simple Usage (for a 50% complete task):
<ProgressBar value={50} />

// 2. Custom Color and Value Range (e.g., uploading 3 of 10 files):
<ProgressBar 
    value={3} 
    max={10} 
    color="progress-success"
    className="max-w-md mx-auto"
/>

// 3. Conditional rendering (in a React component):
// const [uploadProgress, setUploadProgress] = useState(0);
// {uploadProgress > 0 && uploadProgress < 100 && (
//     <ProgressBar value={uploadProgress} color="progress-warning" />
// )}
*/
import React, { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/utils/cn';

// Validation Error Component for consistency with FormValidation
const ValidationError = ({ error, touched }) => {
    if (!error || !touched) return null;
    return (
        <div className="text-red-500 dark:text-red-400 text-[10px] mt-1 flex items-center gap-1">
            <AlertCircle size={10} />
            <span>{error}</span>
        </div>
    );
};

export const AmenitiesSelector = ({ 
    amenities = [], 
    onAdd, 
    onRemove, 
    error, 
    touched,
    label = "Amenities & Services",
    maxLength = 20
}) => {
    const [inputValue, setInputValue] = useState('');
    const [inputError, setInputError] = useState('');
    const [isTouched, setIsTouched] = useState(false);

    const validateInput = (value) => {
        if (!value.trim()) {
            return 'Please enter an amenity';
        }
        if (amenities.includes(value.trim())) {
            return 'Amenity already added';
        }
        if (value.trim().length > maxLength) {
            return `Amenity cannot exceed ${maxLength} characters`;
        }
        return null;
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        if (isTouched) {
            setInputError(validateInput(value));
        }
    };

    const handleInputBlur = () => {
        setIsTouched(true);
        setInputError(validateInput(inputValue));
    };

    const handleAdd = () => {
        const validationError = validateInput(inputValue);
        
        if (validationError) {
            showToast({ icon: 'warning', title: validationError });
            setInputError(validationError);
            setIsTouched(true);
            return;
        }
        
        onAdd(inputValue.trim());
        setInputValue('');
        setInputError('');
        setIsTouched(false);
        showToast({ icon: 'success', title: 'Amenity added', duration: 1000 });
    };

    const quickAdds = [
        "High-speed WiFi", "Air Conditioning", "Parking", "Coffee/Tea", 
        "Meeting Rooms", "Printing", "Lockers", "CCTV", "Shower", "Kitchen",
        "Standing Desks", "Phone Booths", "Outdoor Terrace", "Nap Room",
        "Event Space", "Whiteboard", "Projector", "Printer", "Scanner"
    ];

    const currentLength = inputValue.length;
    const isNearLimit = currentLength > maxLength * 0.8;
    const isAtLimit = currentLength >= maxLength;

    return (
        <div className="bg-linear-to-br from-muted/50 to-muted/80 rounded-2xl p-4 sm:p-6 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="text-sm sm:text-base">✨</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-tighter">
                        {label}
                    </h3>
                </div>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground">
                    Click on any amenity to remove it
                </span>
            </div>

            {amenities.length > 0 && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <p className="text-[8px] sm:text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 sm:mb-3">
                        ✓ Current Amenities ({amenities.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {amenities.map((amenity, idx) => (
                            <span
                                key={idx}
                                onClick={() => onRemove(amenity)}
                                className="group inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-medium cursor-pointer hover:bg-red-500/30 hover:text-red-600 dark:hover:text-red-300 transition-all"
                            >
                                <span className="max-w-37.5 truncate">{amenity}</span>
                                <X size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        Add New Amenity
                    </label>
                    <span className={cn(
                        "text-[8px] font-mono",
                        isAtLimit ? 'text-red-500 dark:text-red-400' : 
                        isNearLimit ? 'text-amber-600 dark:text-amber-400' : 
                        'text-muted-foreground'
                    )}>
                        {currentLength}/{maxLength}
                    </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder={`Type any amenity (max ${maxLength} chars)...`}
                            maxLength={maxLength}
                            className={cn(
                                "w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl",
                                "bg-background border",
                                "text-foreground placeholder:text-muted-foreground",
                                "text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary",
                                "transition-all",
                                (inputError && isTouched) || isAtLimit 
                                    ? 'border-red-500 dark:border-red-400' 
                                    : 'border-border'
                            )}
                        />
                        {currentLength > 0 && (
                            <div className="mt-1 h-0.5 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-300 rounded-full",
                                        isAtLimit ? 'bg-red-500' : 
                                        isNearLimit ? 'bg-amber-500' : 
                                        'bg-emerald-500'
                                    )}
                                    style={{ width: `${(currentLength / maxLength) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isAtLimit}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Add
                    </button>
                </div>
                <ValidationError error={inputError} touched={isTouched} />
                <p className="text-[7px] sm:text-[8px] text-muted-foreground mt-1.5 sm:mt-2">
                    💡 Tip: You can add ANY amenity - be specific! (Max {maxLength} characters)
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[7px] sm:text-[8px] text-muted-foreground mb-2">Quick add examples:</p>
                <div className="flex flex-wrap gap-1">
                    {quickAdds.map(ex => {
                        const isTooLong = ex.length > maxLength;
                        const displayText = isTooLong ? ex.substring(0, maxLength - 3) + '…' : ex;
                        const isAlreadyAdded = amenities.includes(ex);
                        
                        return (
                            <button
                                key={ex}
                                type="button"
                                onClick={() => {
                                    if (isAlreadyAdded) {
                                        showToast({ 
                                            icon: 'info', 
                                            title: 'Already Added',
                                            text: `"${displayText}" is already in your amenities list`,
                                            duration: 1500
                                        });
                                        return;
                                    }
                                    if (ex.length > maxLength) {
                                        showToast({ 
                                            icon: 'warning', 
                                            title: `Amenity exceeds ${maxLength} characters`,
                                            text: `"${ex}" is too long. Please type a shorter version.`
                                        });
                                        return;
                                    }
                                    onAdd(ex);
                                    showToast({ icon: 'success', title: `Added "${displayText}"`, duration: 800 });
                                }}
                                className={cn(
                                    "text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-1 rounded-full transition-all flex items-center gap-1",
                                    isAlreadyAdded
                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-not-allowed opacity-60'
                                        : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                )}
                                disabled={isAlreadyAdded}
                            >
                                {isAlreadyAdded ? (
                                    <Check size={8} className="text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <span className="text-[8px]">+</span>
                                )}
                                {displayText}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
import React from 'react';
import { AlertCircle } from 'lucide-react';

// ==================== VALIDATION ERROR COMPONENT ====================
export const ValidationError = ({ error, touched }) => {
    if (!error || !touched) return null;
    return (
        <div className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
            <AlertCircle size={10} />
            <span>{error}</span>
        </div>
    );
};

// ==================== REUSABLE FORM INPUT WITH VALIDATION ====================
export const FormInput = ({ 
    label, 
    name, 
    type = "text", 
    value, 
    onChange, 
    onBlur, 
    error, 
    touched, 
    required = false, 
    placeholder = "", 
    readOnly = false,
    min,
    max,
    maxLength,
    step,
    className = ""
}) => {
    // Built-in validation for numeric fields
    const getValidationError = (val) => {
        if (required && !val) return `${label} is required`;
        
        // Numeric field validation
        if (type === 'number' || name === 'rate_hour' || name === 'capacity' || name === 'available_rooms') {
            if (val && isNaN(val)) return `${label} must be a number`;
            if (val && parseFloat(val) < 0) return `${label} cannot be negative`;
            // Only require > 0 for required fields
            if (required && val && parseFloat(val) === 0) return `${label} must be greater than 0`;
            if (name === 'rate_hour' && val && parseFloat(val) > 10000) return `${label} cannot exceed ₱10,000`;
            if (name === 'capacity' && val && parseFloat(val) > 1000) return `${label} cannot exceed 1000`;
            if (name === 'capacity' && val && !Number.isInteger(parseFloat(val))) return `${label} must be a whole number`;
            if (name === 'available_rooms' && val && !Number.isInteger(parseFloat(val))) return `${label} must be a whole number`;
        }
        
        if (name === 'name' && val && val.length > 50) return `${label} cannot exceed 50 characters`;
        
        return null;
    };
    
    const displayError = error || (touched ? getValidationError(value) : null);
    
    // Handle change with validation
    const handleChange = (e) => {
        const newValue = e.target.value;
        
        // For numeric fields, prevent negative values
        if (type === 'number' || name === 'rate_hour' || name === 'capacity' || name === 'available_rooms') {
            // Allow empty string
            if (newValue === '') {
                onChange(e);
                return;
            }
            
            // Check if value is valid number (no negative sign allowed)
            if (name === 'rate_hour') {
                // Allow positive numbers with optional decimal
                if (/^\d*\.?\d*$/.test(newValue) && parseFloat(newValue) >= 0) {
                    onChange(e);
                }
            } else {
                // For capacity and available_rooms - only whole positive numbers
                if (/^\d+$/.test(newValue) && parseInt(newValue) >= 0) {
                    onChange(e);
                }
            }
        } else {
            onChange(e);
        }
    };
    
    return (
        <div className="mb-4">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                {label} {required && <span className="text-red-400">*</span>}
                {maxLength && (
                    <span className="text-slate-600 ml-2">
                        ({value?.length || 0}/{maxLength})
                    </span>
                )}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={handleChange}
                onBlur={onBlur}
                placeholder={placeholder}
                readOnly={readOnly}
                min={min !== undefined ? min : 0}
                max={max}
                maxLength={maxLength}
                step={step}
                className={`w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border ${
                    displayError ? 'border-red-500' : 'border-white/10'
                } text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold ${readOnly ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
            />
            <ValidationError error={displayError} touched={touched} />
        </div>
    );
};

// ==================== REUSABLE FORM SELECT ====================
export const FormSelect = ({ 
    label, 
    name, 
    value, 
    onChange, 
    onBlur,
    required = false, 
    options = [], 
    placeholder = "Select an option",
    disabled = false,
    error,
    touched
}) => {
    const getValidationError = (val) => {
        if (required && !val) return `${label} is required`;
        return null;
    };
    
    const displayError = error || (touched ? getValidationError(value) : null);
    
    return (
        <div className="mb-4">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <select
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                disabled={disabled}
                className={`w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border ${
                    displayError ? 'border-red-500' : 'border-white/10'
                } text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none cursor-pointer ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                <option value="" className="bg-[#111114]">{placeholder}</option>
                {options.map(option => (
                    <option key={option.value} value={option.value} className="bg-[#111114]">
                        {option.label}
                    </option>
                ))}
            </select>
            <ValidationError error={displayError} touched={touched} />
        </div>
    );
};

// ==================== REUSABLE FORM TEXTAREA ====================
export const FormTextArea = ({ 
    label, 
    name, 
    value, 
    onChange, 
    onBlur,
    required = false,
    placeholder = "", 
    rows = 4, 
    maxLength,
    error,
    touched
}) => {
    const getValidationError = (val) => {
        if (required && !val) return `${label} is required`;
        return null;
    };
    
    const displayError = error || (touched ? getValidationError(value) : null);
    
    return (
        <div className="mb-4">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                {label} {required && <span className="text-red-400">*</span>}
                {maxLength && (
                    <span className="text-slate-600 ml-2">
                        ({value?.length || 0}/{maxLength})
                    </span>
                )}
            </label>
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                rows={rows}
                maxLength={maxLength}
                className={`w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border ${
                    displayError ? 'border-red-500' : 'border-white/10'
                } text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold resize-none`}
            />
            <ValidationError error={displayError} touched={touched} />
        </div>
    );
};
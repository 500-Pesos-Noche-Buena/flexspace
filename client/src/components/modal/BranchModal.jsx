import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Building, AlertCircle } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/utils/cn';

export const BranchModal = ({ 
    isOpen, 
    onClose, 
    staffMember, 
    onSave, 
    isEditMode,
    spaces,
    loadingSpaces 
}) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        space_id: '',
        password: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (staffMember) {
            let spaceIdValue = '';
            if (staffMember.space_id) {
                if (typeof staffMember.space_id === 'object' && staffMember.space_id._id) {
                    spaceIdValue = staffMember.space_id._id;
                } else if (typeof staffMember.space_id === 'string') {
                    spaceIdValue = staffMember.space_id;
                }
            }
            
            setFormData({
                name: staffMember.name || '',
                email: staffMember.email || '',
                space_id: spaceIdValue,
                password: ''
            });
        }
    }, [staffMember]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!isEditMode && !formData.space_id) newErrors.space_id = 'Please select a branch';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        const submitData = {
            name: formData.name,
            email: formData.email
        };
        
        if (!isEditMode) {
            submitData.password = formData.password || 'FlexSpace2026';
            submitData.space_id = formData.space_id;
            submitData.role = 'staff';
            console.log('Creating staff with data:', submitData);
        } else if (formData.space_id !== getOriginalSpaceId()) {
            submitData.space_id = formData.space_id;
            console.log('Updating staff with transfer:', submitData);
        }
        
        await onSave(submitData);
    };

    const getOriginalSpaceId = () => {
        if (!staffMember?.space_id) return '';
        if (typeof staffMember.space_id === 'object' && staffMember.space_id._id) {
            return staffMember.space_id._id;
        }
        return staffMember.space_id;
    };

    const getBranchName = (spaceId) => {
        if (!spaceId) return 'Not Assigned';
        if (typeof spaceId === 'object' && spaceId.name) {
            return spaceId.name;
        }
        const space = spaces.find(s => s._id === spaceId);
        return space ? space.name : 'Unknown Branch';
    };

    // Get dynamic button color
    const getButtonColor = () => {
        const savedColor = localStorage.getItem('theme_color') || 'indigo';
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[savedColor] || colors.indigo;
    };

    return (
        <Modal 
            open={isOpen} 
            onClose={onClose} 
            title={isEditMode ? "Edit Staff Profile" : "Register New Staff"} 
            size="md"
        >
            <div className="space-y-4 py-2">
                {/* Full Name */}
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">
                        Full Name <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={cn(
                            "w-full mt-2 px-4 py-3 rounded-2xl",
                            "bg-background border",
                            "text-foreground placeholder:text-muted-foreground",
                            "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary",
                            "transition-all text-sm font-bold",
                            errors.name 
                                ? "border-red-500 dark:border-red-400" 
                                : "border-border"
                        )}
                        placeholder="e.g. John Doe"
                    />
                    {errors.name && (
                        <p className="text-red-500 dark:text-red-400 text-[10px] mt-1">{errors.name}</p>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">
                        Email Address <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={cn(
                            "w-full mt-2 px-4 py-3 rounded-2xl",
                            "bg-background border",
                            "text-foreground placeholder:text-muted-foreground",
                            "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary",
                            "transition-all text-sm font-bold",
                            errors.email 
                                ? "border-red-500 dark:border-red-400" 
                                : "border-border"
                        )}
                        placeholder="staff@flexspace.ph"
                    />
                    {errors.email && (
                        <p className="text-red-500 dark:text-red-400 text-[10px] mt-1">{errors.email}</p>
                    )}
                </div>

                {/* Branch Selection */}
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">
                        Assign to Branch {!isEditMode && <span className="text-red-500 dark:text-red-400">*</span>}
                        {isEditMode && <span className="text-amber-500 dark:text-amber-400 ml-2">(Can be changed to transfer)</span>}
                    </label>
                    
                    {loadingSpaces ? (
                        <div className="w-full mt-2 px-4 py-3 rounded-2xl bg-muted border border-border text-muted-foreground text-sm">
                            Loading branches...
                        </div>
                    ) : spaces.length === 0 ? (
                        <div className="w-full mt-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                            <AlertCircle size={14} />
                            No branches available. Please create a space first.
                        </div>
                    ) : (
                        <select
                            value={formData.space_id || ''}
                            onChange={(e) => {
                                console.log('Selected branch ID:', e.target.value);
                                setFormData({ ...formData, space_id: e.target.value });
                            }}
                            className={cn(
                                "w-full mt-2 px-4 py-3 rounded-2xl",
                                "bg-background border",
                                "text-foreground",
                                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary",
                                "transition-all text-sm font-bold appearance-none cursor-pointer",
                                errors.space_id 
                                    ? "border-red-500 dark:border-red-400" 
                                    : "border-border"
                            )}
                        >
                            <option value="" className="bg-background text-foreground">
                                {isEditMode ? "-- Select new branch to transfer --" : "-- Select a branch --"}
                            </option>
                            {spaces.map(space => (
                                <option key={space._id} value={space._id} className="bg-background text-foreground">
                                    {space.name} {isEditMode && getOriginalSpaceId() === space._id ? "(Current)" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {errors.space_id && (
                        <p className="text-red-500 dark:text-red-400 text-[10px] mt-1">{errors.space_id}</p>
                    )}
                    
                    <p className="text-[8px] text-muted-foreground mt-1">
                        {isEditMode 
                            ? "Select a different branch to transfer this staff member"
                            : "Staff will only have access to this specific branch"}
                    </p>
                </div>

                {/* Current Branch Info (Edit Mode Only) */}
                {isEditMode && staffMember?.space_id && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                            <Building size={12} className="text-amber-600 dark:text-amber-400" />
                            <p className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                                Current Branch
                            </p>
                        </div>
                        <p className="text-[11px] text-foreground font-bold mt-1">
                            {getBranchName(staffMember.space_id)}
                        </p>
                        {formData.space_id !== getOriginalSpaceId() && formData.space_id && (
                            <p className="text-[8px] text-emerald-600 dark:text-emerald-400 mt-1">
                                Will be transferred to: {getBranchName(formData.space_id)}
                            </p>
                        )}
                    </div>
                )}

                {/* Password (Create Mode Only) */}
                {!isEditMode && (
                    <div>
                        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Access Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-bold"
                            placeholder="Leave blank for: FlexSpace2026"
                        />
                        <p className="text-[8px] text-muted-foreground mt-1">
                            Default password: FlexSpace2026
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-4 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={cn(
                            "flex-1 py-4 rounded-2xl",
                            "bg-primary text-primary-foreground",
                            "font-black text-[10px] uppercase shadow-xl",
                            "hover:opacity-90 active:scale-95",
                            "transition-all",
                            getButtonColor()
                        )}
                    >
                        {isEditMode ? 'Update & Transfer' : 'Confirm Staff'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
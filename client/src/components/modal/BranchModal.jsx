import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Building, AlertCircle } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

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
            // Handle both cases: space_id as string or as populated object
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
            submitData.space_id = formData.space_id;  // Make sure this is included
            submitData.role = 'staff';
            console.log('Creating staff with data:', submitData); // Debug log
        } else if (formData.space_id !== getOriginalSpaceId()) {
            submitData.space_id = formData.space_id;
            console.log('Updating staff with transfer:', submitData); // Debug log
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
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                        Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border ${
                            errors.name ? 'border-red-500' : 'border-white/10'
                        } text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold`}
                        placeholder="e.g. John Doe"
                    />
                    {errors.name && (
                        <p className="text-red-400 text-[10px] mt-1">{errors.name}</p>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                        Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border ${
                            errors.email ? 'border-red-500' : 'border-white/10'
                        } text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold`}
                        placeholder="staff@flexspace.ph"
                    />
                    {errors.email && (
                        <p className="text-red-400 text-[10px] mt-1">{errors.email}</p>
                    )}
                </div>

                {/* Branch Selection */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                        Assign to Branch {!isEditMode && <span className="text-red-400">*</span>}
                        {isEditMode && <span className="text-amber-400 ml-2">(Can be changed to transfer)</span>}
                    </label>
                    
                    {loadingSpaces ? (
                        <div className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm">
                            Loading branches...
                        </div>
                    ) : spaces.length === 0 ? (
                        <div className="w-full mt-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
                            <AlertCircle size={14} />
                            No branches available. Please create a space first.
                        </div>
                    ) : (
                        <select
                            value={formData.space_id || ''}
                            onChange={(e) => {
                                console.log('Selected branch ID:', e.target.value); // Debug log
                                setFormData({ ...formData, space_id: e.target.value });
                            }}
                            className={`w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border ${
                                errors.space_id ? 'border-red-500' : 'border-white/10'
                            } text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none cursor-pointer`}
                        >
                            <option value="" className="bg-[#111114]">
                                {isEditMode ? "-- Select new branch to transfer --" : "-- Select a branch --"}
                            </option>
                            {spaces.map(space => (
                                <option key={space._id} value={space._id} className="bg-[#111114]">
                                    {space.name} {isEditMode && getOriginalSpaceId() === space._id ? "(Current)" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {errors.space_id && (
                        <p className="text-red-400 text-[10px] mt-1">{errors.space_id}</p>
                    )}
                    
                    <p className="text-[8px] text-slate-500 mt-1">
                        {isEditMode 
                            ? "Select a different branch to transfer this staff member"
                            : "Staff will only have access to this specific branch"}
                    </p>
                </div>

                {/* Current Branch Info (Edit Mode Only) */}
                {isEditMode && staffMember?.space_id && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                            <Building size={12} className="text-amber-400" />
                            <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider">
                                Current Branch
                            </p>
                        </div>
                        <p className="text-[11px] text-white font-bold mt-1">
                            {getBranchName(staffMember.space_id)}
                        </p>
                        {formData.space_id !== getOriginalSpaceId() && formData.space_id && (
                            <p className="text-[8px] text-emerald-400 mt-1">
                                Will be transferred to: {getBranchName(formData.space_id)}
                            </p>
                        )}
                    </div>
                )}

                {/* Password (Create Mode Only) */}
                {!isEditMode && (
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Access Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold"
                            placeholder="Leave blank for: FlexSpace2026"
                        />
                        <p className="text-[8px] text-slate-500 mt-1">
                            Default password: FlexSpace2026
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase shadow-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                    >
                        {isEditMode ? 'Update & Transfer' : 'Confirm Staff'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

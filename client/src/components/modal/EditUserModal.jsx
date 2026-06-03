import React from 'react';
import { Modal } from '@/components/ui/Modal';

export const EditUserModal = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = React.useState({ name: '', email: '' });
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSubmit = async () => {
        setSaving(true);
        await onSave(formData);
        setSaving(false);
    };

    if (!user) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title="Edit Account" size="md">
            <div className="space-y-4 py-2">
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Full Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground focus:border-primary transition-all text-sm outline-none font-bold"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Email Address</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground focus:border-primary transition-all text-sm outline-none font-bold"
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
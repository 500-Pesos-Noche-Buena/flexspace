// hooks/usePendingFees.js
import { useState, useEffect } from 'react';
import { apiGet } from '@/utils/Api';

export const usePendingFees = () => {
    const [pendingFees, setPendingFees] = useState(0);
    const [hasPendingFees, setHasPendingFees] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPendingFees = async () => {
            try {
                const response = await apiGet('/space/earnings/pending');
                if (response.success) {
                    setPendingFees(response.data.total_pending);
                    setHasPendingFees(response.data.total_pending > 0);
                }
            } catch (error) {
                console.error('Failed to fetch pending fees:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPendingFees();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingFees, 30000);
        return () => clearInterval(interval);
    }, []);

    return { pendingFees, hasPendingFees, loading };
};
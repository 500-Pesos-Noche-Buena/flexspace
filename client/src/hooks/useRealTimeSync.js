import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

export const useRealTimeSync = (endpoint, initialParams = {}, initialStats = {}) => {
    const [data, setData] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState(initialStats);
    const [loading, setLoading] = useState(true);
    const [params, setParams] = useState(initialParams);
    
    const lastFingerprint = useRef("");
    const lastParamsStr = useRef(JSON.stringify(initialParams));

    const fetchData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        
        try {
            const query = new URLSearchParams(params).toString();
            const res = await apiGet(`${endpoint}${query ? `?${query}` : ''}`);

            const rowData = res.requests || res.owners || res.data?.requests || res.data?.owners || res.data?.rows || [];
            const total = res.total || res.data?.total || 0;
            const fetchedStats = res.stats || res.data?.stats || (res.data && Object.keys(res.data).length > 0 ? res.data : res) || initialStats;

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            if (currentFingerprint !== lastFingerprint.current) {
                lastFingerprint.current = currentFingerprint;
                setData(Array.isArray(rowData) ? rowData : []);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch (err) {
            if (isInitial) showToast({ icon: 'error', title: 'Failed to sync with server' });
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [endpoint, params, initialStats]);

    const updateParams = useCallback((newParamsOrFn) => {
        setParams(prev => {
            const nextParams = typeof newParamsOrFn === 'function' ? newParamsOrFn(prev) : newParamsOrFn;
            const nextParamsStr = JSON.stringify(nextParams);
            
            if (nextParamsStr === lastParamsStr.current) {
                return prev;
            }
            
            lastParamsStr.current = nextParamsStr;
            return nextParams;
        });
    }, []);

    useEffect(() => {
        fetchData(true);
        const interval = setInterval(() => fetchData(false), 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return { 
        data, 
        totalCount, 
        stats, 
        loading, 
        params, 
        setParams: updateParams,
        refresh: () => fetchData(true) 
    };
};
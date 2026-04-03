import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from './table'; // Ensure these path matches your UI components
import { cn } from "@/lib/utils";

// Custom hook for debouncing search inputs to prevent API spam
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function DataTable({
    columns,
    data,
    loading,
    totalCount,
    onParamsChange,
    renderMobileCard // This function defines how each row looks on a phone
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 500);

    // 1. Trigger API fetch whenever search or page changes
    useEffect(() => {
        onParamsChange({ page, search: debouncedSearch });
    }, [page, debouncedSearch]);

    // 2. Reset to page 1 automatically when the user starts typing
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // 3. Helper to scroll back to top when changing pages on mobile
    const handlePageChange = (newPage) => {
        setPage(newPage);
        if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            
            {/* --- SEARCH SECTION --- */}
            <div className="relative w-full md:max-w-sm group px-2 md:px-0">
                <Search className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 md:pl-10 pr-4 py-4 md:py-2.5 bg-[#111114] border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-xl md:shadow-none placeholder:text-slate-600 font-bold"
                />
            </div>

            {/* --- LOADING STATE --- */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Syncing Cloud Data...</span>
                </div>
            ) : (
                <>
                    {/* --- MOBILE VIEW (Card Layout) --- */}
                    <div className="grid grid-cols-1 gap-4 md:hidden px-2">
                        {data.length === 0 ? (
                            <div className="py-20 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                No matching records found
                            </div>
                        ) : (
                            data.map((item, index) => renderMobileCard ? renderMobileCard(item, index) : null)
                        )}
                    </div>

                    {/* --- DESKTOP VIEW (Table Layout) --- */}
                    <div className="hidden md:block bg-[#111114] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/5">
                                    {columns.map((col, i) => (
                                        <TableHead key={i} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {col.header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-white/5">
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-64 text-center text-slate-600 text-xs font-black uppercase tracking-widest">
                                            No records in database
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row, rowIndex) => (
                                        <TableRow key={rowIndex} className="hover:bg-white/[0.01] transition-colors border-white/5">
                                            {columns.map((col, colIndex) => (
                                                <TableCell key={colIndex} className="px-6 py-4">
                                                    {col.cell ? col.cell(row) : row[col.accessor]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            {/* --- PAGINATION SECTION --- */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 py-4">
                <div className="flex flex-col items-center md:items-start gap-1 order-2 md:order-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Displaying <span className="text-emerald-500">{data.length}</span> of {totalCount}
                    </p>
                </div>

                <div className="flex items-center gap-2 order-1 md:order-2 w-full md:w-auto">
                    <button
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
                        disabled={page === 1 || loading}
                        className="flex-1 md:flex-none flex items-center justify-center p-4 md:p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 active:bg-emerald-500 active:text-white disabled:opacity-20 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                    
                    <div className="px-6 py-3 md:py-2 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-white uppercase tracking-tighter">Page {page}</span>
                    </div>

                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={data.length < 10 || loading}
                        className="flex-1 md:flex-none flex items-center justify-center p-4 md:p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 active:bg-emerald-500 active:text-white disabled:opacity-20 transition-all"
                    >
                        <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
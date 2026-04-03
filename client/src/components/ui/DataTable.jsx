import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from './table';
import { cn } from "@/lib/utils";

// Custom hook for debouncing search inputs
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
    onParamsChange
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 500);

    // Trigger API fetch whenever search or page changes
    useEffect(() => {
        onParamsChange({ page, search: debouncedSearch });
    }, [page, debouncedSearch]);

    // Reset to page 1 when searching
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    return (
        <div className="space-y-4">
            {/* 1. SEARCH BAR SECTION */}
            <div className="relative max-w-sm group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#111114] border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
            </div>

            {/* 2. THE TABLE */}
            <div className="bg-[#111114] rounded-[2rem] border border-white/5 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow>
                            {columns.map((col, i) => (
                                <TableHead key={i} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-white/5">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Syncing Data...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-48 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                                    No records found
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow key={rowIndex} className="hover:bg-white/[0.01] transition-colors">
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

            {/* 3. PAGINATION CONTROLS */}
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Showing <span className="text-indigo-500">{data.length}</span> of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white px-4">Page {page}</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={data.length < 10 || loading} // Assuming limit is 10
                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
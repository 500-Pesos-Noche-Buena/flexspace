import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table'; 
import { cn } from "@/lib/utils";

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
    renderMobileCard,
    className
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 500);
    
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        onParamsChange({ page, search: debouncedSearch });
    }, [page, debouncedSearch, onParamsChange]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1); 
    };

    const handlePageChange = (newPage) => {
        if (newPage === page || newPage < 1) return;
        setPage(newPage);
        if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className={cn("space-y-4 md:space-y-6", className)}>
            {/* Search Bar */}
            <div className="relative w-full md:max-w-sm group px-2 md:px-0">
                <Search className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={handleSearchChange}
                    className={cn(
                        "w-full pl-12 md:pl-10 pr-4 py-4 md:py-2.5",
                        "bg-card border border-border rounded-2xl",
                        "text-sm text-foreground focus:outline-none focus:border-primary/50",
                        "transition-all shadow-xl md:shadow-none placeholder:text-muted-foreground font-bold"
                    )}
                />
            </div>

            {loading && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: `var(--theme-primary)` }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Cloud Data...</span>
                </div>
            ) : (
                <>
                    {/* --- MOBILE VIEW --- */}
                    <div className="grid grid-cols-1 gap-4 md:hidden px-2">
                        {data.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest italic">
                                No matching records found
                            </div>
                        ) : (
                            data.map((item, index) => renderMobileCard ? renderMobileCard(item, index) : null)
                        )}
                    </div>

                    {/* --- DESKTOP VIEW --- */}
                    <div className="hidden md:block bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow className="border-border hover:bg-transparent">
                                    {columns.map((col, i) => (
                                        <TableHead key={i} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {col.header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border">
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-64 text-center text-muted-foreground text-xs font-black uppercase tracking-widest italic">
                                            No records in database
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row, rowIndex) => (
                                        <TableRow key={rowIndex} className="hover:bg-muted/20 transition-colors border-border">
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

            {/* Pagination Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 py-4">
                <div className="flex flex-col items-center md:items-start gap-1 order-2 md:order-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Displaying <span className="text-primary">{data.length}</span> of {totalCount}
                    </p>
                </div>

                <div className="flex items-center gap-2 order-1 md:order-2 w-full md:w-auto">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1 || loading}
                        className="flex-1 md:flex-none flex items-center justify-center p-4 md:p-2.5 rounded-2xl bg-muted border border-border text-muted-foreground active:bg-primary active:text-primary-foreground disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                    
                    <div className="px-6 py-3 md:py-2 bg-muted rounded-2xl border border-border">
                        <span className="text-xs font-black text-foreground uppercase tracking-tighter">Page {page}</span>
                    </div>

                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={data.length < 10 || loading}
                        className="flex-1 md:flex-none flex items-center justify-center p-4 md:p-2.5 rounded-2xl bg-muted border border-border text-muted-foreground active:bg-primary active:text-primary-foreground disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
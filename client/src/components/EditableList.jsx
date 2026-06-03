import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const EditableList = ({ 
    title, 
    items, 
    arrayName, 
    renderItem, 
    defaultItem, 
    onUpdate, 
    onAdd, 
    onRemove,
    editing = false 
}) => {
    const { themeColor } = useTheme();

    return (
        <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-6">
                <h3 className="text-sm font-black text-foreground uppercase tracking-tighter mb-4">{title}</h3>
                <div className="space-y-2">
                    {items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {renderItem(item, i)}
                            {editing && (
                                <button
                                    onClick={() => onRemove(arrayName, i)}
                                    className="p-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    {editing && (
                        <button
                            onClick={() => onAdd(arrayName, defaultItem)}
                            className="w-full py-2 mt-2 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center gap-1"
                        >
                            <Plus size={12} /> Add
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
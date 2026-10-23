import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Reusable PageHeader component matching the AI Operations & Model Routing design.
 *
 * @param {string} title - Page title
 * @param {string} description - Page subtitle/description
 * @param {React.ComponentType | React.ReactNode} icon - Lucide icon component or element
 * @param {React.ReactNode} badge - Optional badge displayed next to the title
 * @param {React.ReactNode} children - Action buttons or content placed on the right side
 * @param {React.ReactNode} actions - Alias for children (action buttons)
 * @param {string} className - Optional container styling
 * @param {string} iconClassName - Optional styling for the icon container
 */
const PageHeader = ({
    title,
    description,
    icon: Icon,
    badge,
    children,
    actions,
    className,
    iconClassName,
}) => {
    const renderIcon = () => {
        if (!Icon) return null;
        if (React.isValidElement(Icon)) return Icon;
        return <Icon className="w-6 h-6" />;
    };

    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6 mb-8",
            className
        )}>
            <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {Icon && (
                        <div className={cn(
                            "p-2 rounded-xl bg-primary/10 text-primary shrink-0",
                            iconClassName
                        )}>
                            {renderIcon()}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {title}
                    </h1>
                    {badge && (
                        <div className="inline-flex items-center">
                            {badge}
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                        {description}
                    </p>
                )}
            </div>

            {(actions || children) && (
                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    {actions || children}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
export { PageHeader };

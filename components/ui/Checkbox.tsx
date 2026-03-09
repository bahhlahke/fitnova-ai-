import React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string | React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(

    ({ label, className = "", id, ...props }, ref) => {
        return (
            <div className={`flex items-start gap-3 ${className}`}>
                <div className="relative flex h-5 items-center">
                    <input
                        {...props}
                        id={id}
                        ref={ref}
                        type="checkbox"
                        className="h-4 w-4 rounded border-fn-border bg-fn-surface text-fn-accent focus:ring-fn-accent/20 transition-all cursor-pointer"
                    />
                </div>
                {label && (
                    <label
                        htmlFor={id}
                        className="text-sm font-medium leading-relaxed text-fn-muted cursor-pointer select-none"
                    >
                        {label}
                    </label>
                )}
            </div>
        );
    }
);

Checkbox.displayName = "Checkbox";

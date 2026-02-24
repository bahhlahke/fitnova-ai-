import type { TextareaHTMLAttributes } from "react";

const textareaBase =
  "min-h-[120px] w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white placeholder-fn-muted focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal resize-y";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea className={`${textareaBase} ${className}`.trim()} {...props} />
  );
}

import type { TextareaHTMLAttributes } from "react";

const textareaBase =
  "min-h-[120px] w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-fn-ink placeholder-fn-muted focus:border-fn-primary focus:outline-none focus:ring-2 focus:ring-fn-primary/20 resize-y";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea className={`${textareaBase} ${className}`.trim()} {...props} />
  );
}

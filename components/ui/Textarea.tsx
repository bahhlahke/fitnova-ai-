import type { TextareaHTMLAttributes } from "react";

const textareaBase =
  "min-h-[120px] w-full rounded-xl border border-fn-border bg-white px-4 py-3 text-black placeholder-neutral-400 focus:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600/20 resize-y";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea className={`${textareaBase} ${className}`.trim()} {...props} />
  );
}

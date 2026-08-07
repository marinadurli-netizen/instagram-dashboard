"use client";

import { useState, useTransition, type CSSProperties } from "react";

interface EditableTextProps {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
  className?: string;
  style?: CSSProperties;
}

// Always rendered as an input/textarea (no separate click-to-edit toggle) —
// that's what "inline-editable" means here. Saves on blur, or Enter for
// single-line fields.
export function EditableText({ value, placeholder, multiline, onSave, className, style }: EditableTextProps) {
  const [draft, setDraft] = useState(value);
  const [, startTransition] = useTransition();

  function commit() {
    if (draft === value) return;
    startTransition(() => {
      void onSave(draft);
    });
  }

  const sharedClassName = `w-full resize-none rounded bg-transparent px-1 -mx-1 outline-none focus:ring-1 focus:ring-[var(--idea)] ${className ?? ""}`;

  if (multiline) {
    return (
      <textarea
        value={draft}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.blur();
        }}
        className={sharedClassName}
        style={style}
      />
    );
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={sharedClassName}
      style={style}
    />
  );
}

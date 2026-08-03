"use client";

import { useState } from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  className?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required,
  minLength,
  disabled,
  className = "auth-field",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
      {label}
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} pr-10`}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={visible ? "隐藏密码" : "显示密码"}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--mist)] hover:text-[var(--paper)] disabled:opacity-40"
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 3l18 18M10.5 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.4 10.4 0 0112 5c5 0 9.3 3.1 10.5 7.5a11 11 0 01-4.1 5.1M6.1 6.6A11 11 0 001.5 12.5C2.7 16.9 7 20 12 20c1.4 0 2.7-.3 3.9-.7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M2 12.5C3.2 8.1 7.5 5 12.5 5S21.8 8.1 23 12.5C21.8 16.9 17.5 20 12.5 20S3.2 16.9 2 12.5z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="12.5" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}

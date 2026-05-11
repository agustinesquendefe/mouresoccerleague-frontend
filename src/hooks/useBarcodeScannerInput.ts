'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseBarcodeScannerInputOptions = {
  enabled: boolean;
  submitOnIdle: boolean;
  idleMs: number;
  onScan: (barcode: string) => Promise<void> | void;
};

function normalizeBarcode(value: string) {
  return value.trim();
}

function isInteractiveElement(element: HTMLElement | null) {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  if (['input', 'button', 'select', 'textarea', 'option'].includes(tagName)) {
    return true;
  }

  const role = element.getAttribute('role');
  if (role && ['button', 'checkbox', 'combobox', 'listbox', 'menuitem', 'option', 'switch', 'textbox'].includes(role)) {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(element.closest('button, [role="button"], [role="switch"], [role="combobox"], [role="listbox"]'));
}

export function useBarcodeScannerInput({
  enabled,
  submitOnIdle,
  idleMs,
  onScan,
}: UseBarcodeScannerInputOptions) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const focusInput = useCallback(() => {
    if (!enabled) return;

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [enabled]);

  const submit = useCallback(async () => {
    clearIdleTimer();

    const barcode = normalizeBarcode(value);
    if (!barcode) {
      focusInput();
      return;
    }

    setValue('');
    await onScan(barcode);
    focusInput();
  }, [clearIdleTimer, focusInput, onScan, value]);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    return () => {
      clearIdleTimer();
    };
  }, [clearIdleTimer]);

  const handleChange = useCallback(
    (nextValue: string) => {
      setValue(nextValue);
      clearIdleTimer();

      if (!enabled || !submitOnIdle) return;

      const barcode = normalizeBarcode(nextValue);
      if (!barcode) return;

      idleTimerRef.current = setTimeout(() => {
        const currentValue = normalizeBarcode(inputRef.current?.value ?? nextValue);
        if (!currentValue) return;

        setValue('');
        Promise.resolve(onScan(currentValue)).finally(() => {
          focusInput();
        });
      }, idleMs);
    },
    [clearIdleTimer, enabled, focusInput, idleMs, onScan, submitOnIdle]
  );

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      await submit();
    },
    [submit]
  );

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget as HTMLElement | null;

    if (isInteractiveElement(nextTarget)) {
      return;
    }

    focusInput();
  }, [focusInput]);

  return {
    inputRef,
    value,
    setValue,
    handleChange,
    handleKeyDown,
    handleBlur,
    focusInput,
    submit,
  };
}
import React, {useCallback, useEffect, useRef, useState} from 'react';
import OriginalMermaid from '@theme-original/Mermaid';
import type MermaidType from '@theme/Mermaid';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof MermaidType>;

export default function MermaidWrapper(props: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const openOverlay = useCallback(() => setOpen(true), []);
  const closeOverlay = useCallback(() => {
    setOpen(false);
    // Return focus to the trigger after closing
    triggerRef.current?.focus();
  }, []);

  // Close on Escape key; trap focus inside the overlay when open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeOverlay();
        return;
      }
      // Basic focus trap: keep Tab cycling within the overlay
      if (e.key === 'Tab') {
        const overlay = document.getElementById('mermaid-overlay');
        if (!overlay) return;
        const focusable = overlay.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Move focus to close button when overlay opens
    closeButtonRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOverlay]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openOverlay();
      }
    },
    [openOverlay],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) closeOverlay();
    },
    [closeOverlay],
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="mermaid-zoom-trigger"
        role="button"
        tabIndex={0}
        aria-label="Diagram — click or press Enter to expand"
        onClick={openOverlay}
        onKeyDown={handleTriggerKeyDown}
      >
        <OriginalMermaid {...props} />
        <span className="mermaid-zoom-hint" aria-hidden="true">
          ⤢ Expand
        </span>
      </div>

      {open && (
        <div
          id="mermaid-overlay"
          className="mermaid-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded diagram view"
          onClick={handleBackdropClick}
        >
          <div className="mermaid-overlay-content">
            <button
              ref={closeButtonRef}
              className="mermaid-overlay-close"
              onClick={closeOverlay}
              aria-label="Close expanded diagram"
            >
              ✕
            </button>
            <div className="mermaid-overlay-diagram">
              <OriginalMermaid {...props} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

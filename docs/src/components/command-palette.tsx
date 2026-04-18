import React, {useEffect, useRef, useState} from 'react';
import {useHistory} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {commandPaletteCommands} from './command-palette-commands';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'select' ||
    tagName === 'textarea'
  );
}

function resolveSitePath(baseUrl: string, href: string): string {
  if (href === '/') {
    return baseUrl;
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}${href}`;
}

export default function CommandPalette(): React.JSX.Element {
  const history = useHistory();
  const {
    siteConfig: {baseUrl},
  } = useDocusaurusContext();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(window.navigator.platform));
  }, []);

  const visibleCommands = commandPaletteCommands
    .map((command) => ({
      ...command,
      resolvedHref: resolveSitePath(baseUrl, command.href),
      searchText: [command.title, command.description, command.section, ...(command.keywords ?? [])]
        .join(' ')
        .toLowerCase(),
    }))
    .filter((command) => {
      const trimmedQuery = query.trim().toLowerCase();
      return trimmedQuery === '' || command.searchText.includes(trimmedQuery);
    })
    .slice(0, 12);

  function openPalette(source?: HTMLElement | null) {
    previouslyFocusedElementRef.current = source ?? document.activeElement as HTMLElement | null;
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }

  function closePalette(restoreFocus = true) {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);

    if (restoreFocus) {
      requestAnimationFrame(() => {
        previouslyFocusedElementRef.current?.focus();
      });
    }
  }

  function navigateTo(path: string) {
    closePalette(false);
    history.push(path);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (activeIndex < visibleCommands.length) {
      return;
    }

    setActiveIndex(visibleCommands.length === 0 ? 0 : visibleCommands.length - 1);
  }, [activeIndex, visibleCommands.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const usesCommandPaletteShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k';

      if (usesCommandPaletteShortcut) {
        if (!open && isEditableElement(event.target)) {
          return;
        }

        event.preventDefault();

        if (open) {
          inputRef.current?.focus();
          return;
        }

        openPalette(document.activeElement as HTMLElement | null);
        return;
      }

      if (!open) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements || focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, visibleCommands.length]);

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visibleCommands.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        currentIndex >= visibleCommands.length - 1 ? 0 : currentIndex + 1,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        currentIndex <= 0 ? visibleCommands.length - 1 : currentIndex - 1,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      navigateTo(visibleCommands[activeIndex].resolvedHref);
    }
  }

  return (
    <>
      <button
        type="button"
        className="command-palette-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="command-palette-dialog"
        onClick={(event) => openPalette(event.currentTarget)}
      >
        <span className="command-palette-triggerLabel">Command Palette</span>
        <span className="command-palette-triggerHint" aria-hidden="true">
          {isMac ? 'Cmd K' : 'Ctrl K'}
        </span>
      </button>

      {open && (
        <div
          className="command-palette-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePalette();
            }
          }}
        >
          <div
            ref={dialogRef}
            id="command-palette-dialog"
            className="command-palette-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            aria-describedby="command-palette-subtitle"
          >
            <div className="command-palette-header">
              <div className="command-palette-titleGroup">
                <h2 id="command-palette-title" className="command-palette-title">
                  Command Palette
                </h2>
                <p id="command-palette-subtitle" className="command-palette-subtitle">
                  Search docs pages and jump straight to the next guide, reference, or release-readiness view.
                </p>
              </div>
              <button
                type="button"
                className="command-palette-close"
                onClick={() => closePalette()}
                aria-label="Close command palette"
              >
                Close
              </button>
            </div>

            <label className="command-palette-searchField">
              <span className="command-palette-visuallyHidden">Search docs commands</span>
              <input
                ref={inputRef}
                className="command-palette-input"
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Search docs, features, architecture, and quick links"
              />
            </label>

            <div className="command-palette-resultsMeta">
              {visibleCommands.length === 0
                ? 'No quick matches yet. Use Search The Docs for full-text results.'
                : `${visibleCommands.length} quick match${visibleCommands.length === 1 ? '' : 'es'}`}
            </div>

            {visibleCommands.length === 0 ? (
              <div className="command-palette-emptyState">
                Try a doc title, section name, or keyword like release, api, design, or testing.
              </div>
            ) : (
              <ul className="command-palette-list" role="list">
                {visibleCommands.map((command, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <li key={command.resolvedHref}>
                      <button
                        type="button"
                        className={`command-palette-item${isActive ? ' command-palette-itemActive' : ''}`}
                        onClick={() => navigateTo(command.resolvedHref)}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <div className="command-palette-itemTopRow">
                          <span className="command-palette-itemTitle">{command.title}</span>
                          <span className="command-palette-itemSection">{command.section}</span>
                        </div>
                        <div className="command-palette-itemDescription">{command.description}</div>
                        <div className="command-palette-itemPath">{command.href}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

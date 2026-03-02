// src/components/candidates/zive-x/MandatoryTagSelector.tsx
// UI REFRESH: Modern compact tag selector
// FIXES: popover positioning, viewport overflow, suggestion trigger delay

import { useState, FC, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/zive-x/useDebounce';
import { X, Star, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tag {
  value: string;
  mandatory: boolean;
}

interface MandatoryTagSelectorProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  placeholder?: string;
  fetchSuggestions?: (query: string) => Promise<string[]>;
  queryKey?: string;
  disableSuggestions?: boolean;
}

export const MandatoryTagSelector: FC<MandatoryTagSelectorProps> = ({
  value,
  onChange,
  placeholder,
  fetchSuggestions,
  queryKey,
  disableSuggestions = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Reduced debounce: 200ms for snappier feel ──
  const debouncedSearchTerm = useDebounce(inputValue, 200);

  const { data: suggestions = [], isLoading, isFetching } = useQuery({
    queryKey: [queryKey, debouncedSearchTerm],
    queryFn: () =>
      fetchSuggestions
        ? fetchSuggestions(debouncedSearchTerm)
        : Promise.resolve([]),
    enabled:
      !disableSuggestions &&
      !!fetchSuggestions &&
      debouncedSearchTerm.trim().length >= 1 &&
      isOpen,
    staleTime: 30_000,      // cache for 30s — avoids redundant calls on re-focus
    gcTime: 60_000,
  });

  // ── Determine whether dropdown should open upward ──
  const calcDropDirection = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // If less than 220px below but more above → drop up
    setDropUp(spaceBelow < 220 && spaceAbove > spaceBelow);
  }, []);

  useEffect(() => {
    if (isOpen) calcDropDirection();
  }, [isOpen, calcDropDirection]);

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shouldShow =
    !disableSuggestions &&
    isOpen &&
    debouncedSearchTerm.trim().length >= 1 &&
    (suggestions.length > 0 || isLoading || isFetching);

  // ── Handlers ──
  const handleSelect = (tagValue: string) => {
    const trimmed = tagValue.trim();
    if (!trimmed) return;
    const existing = value.find(
      (t) => t.value.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleRemove(existing.value);
    } else {
      onChange([...value, { value: trimmed, mandatory: false }]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleSelect(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemove(value[value.length - 1].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleRemove = (tagValue: string) => {
    onChange(value.filter((t) => t.value !== tagValue));
  };

  const handleToggleMandatory = (tagValue: string) => {
    onChange(
      value.map((t) =>
        t.value === tagValue ? { ...t, mandatory: !t.mandatory } : t
      )
    );
  };

  const selectedValues = new Set(value.map((t) => t.value));
  const isLoadingAny = isLoading || isFetching;

  return (
    <>
      <style>{`
        /* ── MTS: Mandatory Tag Selector ── */
        .mts-root {
          position: relative;
          width: 100%;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* The main input container — no border/bg here; parent .zxf-input-wrap handles it */
        .mts-field {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          min-height: 36px;
          cursor: text;
          background: transparent;
        }

        /* ── TAG CHIPS ── */
        .mts-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px 2px 4px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: #EDE9FE;
          color: #5B21B6;
          border: 1px solid #DDD6FE;
          max-width: 200px;
          transition: background 0.12s, border-color 0.12s;
          user-select: none;
          line-height: 1.4;
        }
        .mts-tag.mandatory {
          background: #FEF3C7;
          color: #92400E;
          border-color: #FDE68A;
        }

        .mts-tag-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }

        /* Star (mandatory toggle) */
        .mts-star-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px;
          border-radius: 3px;
          border: none;
          background: transparent;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.1s;
        }
        .mts-star-btn:hover { background: rgba(0,0,0,0.06); }
        .mts-star-btn:focus { outline: none; }
        .mts-star-icon { width: 11px; height: 11px; }
        .mts-star-icon.off { color: #C4B5FD; }
        .mts-star-icon.on { color: #F59E0B; fill: #F59E0B; }

        /* Remove button */
        .mts-remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px;
          border-radius: 3px;
          border: none;
          background: transparent;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.1s;
          color: #8B5CF6;
        }
        .mts-remove-btn:hover { background: rgba(91,33,182,0.12); color: #5B21B6; }
        .mts-remove-btn:focus { outline: none; }
        .mts-remove-icon { width: 10px; height: 10px; }

        /* ── TEXT INPUT ── */
        .mts-input {
          flex: 1;
          min-width: 80px;
          font-size: 12.5px;
          color: #111827;
          background: transparent;
          border: none;
          outline: none;
          box-shadow: none;
          padding: 0;
          line-height: 1.5;
        }
        .mts-input::placeholder { color: #9CA3AF; }

        /* ── DROPDOWN ── */
        .mts-dropdown {
          position: absolute;
          left: 0;
          right: 0;
          background: white;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
          z-index: 9999;
          overflow: hidden;
          animation: mts-pop 0.12s cubic-bezier(0.4,0,0.2,1);
        }
        .mts-dropdown.below {
          top: calc(100% + 4px);
          transform-origin: top center;
        }
        .mts-dropdown.above {
          bottom: calc(100% + 4px);
          transform-origin: bottom center;
        }
        @keyframes mts-pop {
          from { opacity: 0; transform: scaleY(0.94); }
          to   { opacity: 1; transform: scaleY(1); }
        }

        /* Scrollable list — max 220px, viewport-safe */
        .mts-list {
          max-height: min(220px, 40vh);
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 4px;
        }
        .mts-list::-webkit-scrollbar { width: 4px; }
        .mts-list::-webkit-scrollbar-track { background: transparent; }
        .mts-list::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
        .mts-list::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }

        /* Loading row */
        .mts-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          font-size: 12px;
          color: #9CA3AF;
        }

        /* Suggestion item */
        .mts-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 12.5px;
          color: #374151;
          cursor: pointer;
          transition: background 0.1s;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        .mts-item:hover { background: #F5F0FF; color: #6C2BD9; }
        .mts-item.selected { color: #6C2BD9; font-weight: 500; }
        .mts-item.selected:hover { background: #EDE9FE; }

        .mts-check { width: 13px; height: 13px; flex-shrink: 0; }
        .mts-check.visible { color: #6C2BD9; }
        .mts-check.hidden { opacity: 0; }

        .mts-item-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Empty state */
        .mts-empty {
          padding: 10px 12px;
          font-size: 12px;
          color: #9CA3AF;
          text-align: center;
        }
      `}</style>

      <div className="mts-root" ref={containerRef}>
        {/* ── INPUT AREA ── */}
        <div
          className="mts-field"
          onClick={() => {
            inputRef.current?.focus();
            setIsOpen(true);
            calcDropDirection();
          }}
        >
          {/* Existing tags */}
          {value.map((tag) => (
            <span
              key={tag.value}
              className={`mts-tag ${tag.mandatory ? 'mandatory' : ''}`}
            >
              {/* Mandatory star */}
              <button
                type="button"
                className="mts-star-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMandatory(tag.value);
                }}
                aria-label={`Mark ${tag.value} as mandatory`}
                title={tag.mandatory ? 'Unmark mandatory' : 'Mark as mandatory'}
              >
                <Star
                  className={`mts-star-icon ${tag.mandatory ? 'on' : 'off'}`}
                />
              </button>

              <span className="mts-tag-label" title={tag.value}>
                {tag.value}
              </span>

              {/* Remove */}
              <button
                type="button"
                className="mts-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(tag.value);
                }}
                aria-label={`Remove ${tag.value}`}
              >
                <X className="mts-remove-icon" />
              </button>
            </span>
          ))}

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            className="mts-input"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              calcDropDirection();
            }}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* ── DROPDOWN ── */}
        {shouldShow && (
          <div
            ref={dropdownRef}
            className={`mts-dropdown ${dropUp ? 'above' : 'below'}`}
          >
            <div className="mts-list">
              {isLoadingAny && suggestions.length === 0 ? (
                <div className="mts-loading">
                  <Loader2 className="w-3 h-3 animate-spin text-[#6C2BD9]" />
                  <span>Searching...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="mts-empty">No results found</div>
              ) : (
                suggestions.map((suggestion) => {
                  const isSelected = selectedValues.has(suggestion);
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      className={`mts-item ${isSelected ? 'selected' : ''}`}
                      onMouseDown={(e) => {
                        // Use mousedown instead of click to fire before blur
                        e.preventDefault();
                        handleSelect(suggestion);
                      }}
                    >
                      <Check
                        className={`mts-check ${isSelected ? 'visible' : 'hidden'}`}
                      />
                      <span className="mts-item-label">{suggestion}</span>
                      {isLoadingAny && (
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-300 ml-auto" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
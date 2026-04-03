// Hrumbles-Front-End_UI/src/components/sales/contact-detail/editor/HubSpotRichTextEditor.tsx
import React, {
  useState, useRef, useCallback, useEffect,
  forwardRef, useImperativeHandle, KeyboardEvent
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Underline, Strikethrough, Link2, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Image, Undo2, Redo2,
  Code, Code2, Minus, Table2, Film, Paperclip, Smile, ChevronDown,
  Highlighter, Palette, Type, Minus as Dedent, Plus as Indent2,
  LetterText, Hash, X, Check, Eraser, Eye, EyeOff, Star, Asterisk,
  CaseSensitive, Subscript, Superscript
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HubSpotEditorRef {
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  clear: () => void;
  insertHTML: (html: string) => void;
}

interface HubSpotRichTextEditorProps {
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  initialContent?: string;
  disabled?: boolean;
  accentColor?: string; // e.g. 'violet' for talent pool, 'teal' for sales
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { value: 'inherit', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
];

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '60', '72'];

const TEXT_COLORS = [
  '#000000','#374151','#6B7280','#9CA3AF','#EF4444','#F97316',
  '#EAB308','#22C55E','#14B8A6','#3B82F6','#8B5CF6','#EC4899',
  '#ffffff','#FEF3C7','#D1FAE5','#DBEAFE','#EDE9FE','#FCE7F3',
];

const HIGHLIGHT_COLORS = [
  { value: 'transparent', label: 'None' },
  { value: '#FEF08A', label: 'Yellow' },
  { value: '#BBF7D0', label: 'Green' },
  { value: '#BFDBFE', label: 'Blue' },
  { value: '#FBCFE8', label: 'Pink' },
  { value: '#FED7AA', label: 'Orange' },
  { value: '#E9D5FF', label: 'Purple' },
  { value: '#FFE4E6', label: 'Rose' },
];

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3'];

const EMOJI_LIST = [
  '😊','😀','😂','😍','🤔','😎','🎉','👍','👎','❤️','🔥','✅',
  '❌','⭐','🚀','💡','📌','🎯','📊','📈','📉','🏆','💼','📋',
  '📝','🔔','⚠️','✨','🌟','💪','🤝','👏','🙏','😅','😤','🤗',
  '😯','🙄','🤦','🤷','👀','🫡','💬','📞','📧','🗓️','⏰','🔐',
];

const SPECIAL_CHARS = [
  '©','®','™','€','£','¥','°','±','×','÷','≠','≤','≥',
  '←','→','↑','↓','↔','↕','«','»','…','—','–','•','§',
  '¶','†','‡','∞','∑','√','∂','∫','α','β','γ','δ','π',
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const HubSpotRichTextEditor = forwardRef<HubSpotEditorRef, HubSpotRichTextEditorProps>(
  ({
    placeholder = 'Start typing…',
    onChange,
    className,
    minHeight = '160px',
    maxHeight = '400px',
    initialContent = '',
    disabled = false,
    accentColor = 'violet',
  }, ref) => {

    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachInputRef = useRef<HTMLInputElement>(null);
    const mentionRef = useRef<HTMLDivElement>(null);

    const [isFocused, setIsFocused] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [htmlViewMode, setHtmlViewMode] = useState(false);
    const [rawHtml, setRawHtml] = useState('');

    // Popover states
    const [linkOpen, setLinkOpen] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [videoOpen, setVideoOpen] = useState(false);
    const [tableOpen, setTableOpen] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [specialOpen, setSpecialOpen] = useState(false);

    // Link form
    const [linkText, setLinkText] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkNewTab, setLinkNewTab] = useState(true);
    const [savedRange, setSavedRange] = useState<Range | null>(null);

    // Image / video URL
    const [imageUrl, setImageUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    // Table config
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    // Active formats
    const [fmt, setFmt] = useState({
      bold: false, italic: false, underline: false, strike: false,
      super: false, sub: false, ol: false, ul: false,
    });
    const [currentFont, setCurrentFont] = useState('inherit');
    const [currentSize, setCurrentSize] = useState('14');

    // ── Imperative handle ──────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      getHTML: () => editorRef.current?.innerHTML || '',
      getText: () => editorRef.current?.textContent || '',
      isEmpty: () => (editorRef.current?.textContent || '').trim().length === 0,
      focus: () => editorRef.current?.focus(),
      clear: () => {
        if (editorRef.current) { editorRef.current.innerHTML = ''; fireChange(); }
      },
      insertHTML: (html: string) => {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, html);
        fireChange();
      },
    }));

    // ── Init ───────────────────────────────────────────────────────────────────

    useEffect(() => {
      if (editorRef.current && initialContent) {
        editorRef.current.innerHTML = initialContent;
        setIsEmpty(initialContent.trim().length === 0);
      }
    }, []); // eslint-disable-line

    // ── Helpers ────────────────────────────────────────────────────────────────

    const fireChange = useCallback(() => {
      const html = editorRef.current?.innerHTML || '';
      const text = editorRef.current?.textContent || '';
      setIsEmpty(text.trim().length === 0);
      onChange?.(html, text);
    }, [onChange]);

    const saveRange = useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) setSavedRange(sel.getRangeAt(0).cloneRange());
    }, []);

    const restoreRange = useCallback(() => {
      if (!savedRange) return;
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
      editorRef.current?.focus();
    }, [savedRange]);

    const exec = useCallback((cmd: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      fireChange();
      detectFormats();
    }, [fireChange]);

    const detectFormats = useCallback(() => {
      setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        super: document.queryCommandState('superscript'),
        sub: document.queryCommandState('subscript'),
        ol: document.queryCommandState('insertOrderedList'),
        ul: document.queryCommandState('insertUnorderedList'),
      });
      const fs = document.queryCommandValue('fontSize');
      if (fs) setCurrentSize(fs);
      const fn = document.queryCommandValue('fontName');
      if (fn) {
        const found = FONT_FAMILIES.find(f =>
          f.value.toLowerCase().includes(fn.toLowerCase().replace(/['"]/g, ''))
        );
        setCurrentFont(found?.value || 'inherit');
      }
    }, []);

    useEffect(() => {
      document.addEventListener('selectionchange', detectFormats);
      return () => document.removeEventListener('selectionchange', detectFormats);
    }, [detectFormats]);

    // ── HTML view toggle ───────────────────────────────────────────────────────

    const toggleHtmlView = () => {
      if (!htmlViewMode) {
        setRawHtml(editorRef.current?.innerHTML || '');
        setHtmlViewMode(true);
      } else {
        if (editorRef.current) editorRef.current.innerHTML = rawHtml;
        setHtmlViewMode(false);
        fireChange();
      }
    };

    // ── Insert helpers ─────────────────────────────────────────────────────────

    const insertHTML = (html: string) => {
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, html);
      fireChange();
    };

    const insertDivider = () => insertHTML('<hr style="border:none;border-top:2px solid #e2e8f0;margin:12px 0;" /><p><br></p>');

    const insertCodeBlock = () => {
      insertHTML(`<pre style="background:#1e293b;color:#e2e8f0;padding:12px 16px;border-radius:8px;font-family:'Courier New',monospace;font-size:13px;overflow-x:auto;margin:8px 0;"><code contenteditable="true">// Your code here</code></pre><p><br></p>`);
    };

    const insertInlineCode = () => {
      const sel = window.getSelection();
      const selectedText = sel?.toString() || 'code';
      insertHTML(`<code style="background:#f1f5f9;color:#7c3aed;padding:2px 6px;border-radius:4px;font-family:'Courier New',monospace;font-size:0.875em;">${selectedText}</code>`);
    };

    const insertChecklist = () => {
      insertHTML(`
        <div class="hrbl-checklist" style="margin:4px 0;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px 0;">
            <input type="checkbox" style="width:14px;height:14px;accent-color:#7c3aed;" />
            <span contenteditable="true">Checklist item</span>
          </label>
        </div>
        <p><br></p>
      `);
    };

    const insertTable = () => {
      const headerRow = Array.from({ length: tableCols }, (_, c) =>
        `<th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f8fafc;font-weight:600;text-align:left;font-size:12px;">Column ${c + 1}</th>`
      ).join('');
      const dataRow = Array.from({ length: tableCols }, () =>
        `<td style="border:1px solid #e2e8f0;padding:8px 12px;" contenteditable="true">&nbsp;</td>`
      ).join('');
      const rows = Array.from({ length: tableRows }, () => `<tr>${dataRow}</tr>`).join('');
      insertHTML(`
        <div style="overflow-x:auto;margin:8px 0;">
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p><br></p>
      `);
      setTableOpen(false);
    };

    const insertVideo = () => {
      if (!videoUrl.trim()) return;
      let embedUrl = videoUrl;
      // Convert YouTube watch URL to embed
      const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      insertHTML(`
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:8px 0;border-radius:8px;">
          <iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:8px;" allowfullscreen></iframe>
        </div>
        <p><br></p>
      `);
      setVideoUrl('');
      setVideoOpen(false);
    };

    const insertImageUrl = () => {
      if (!imageUrl.trim()) return;
      insertHTML(`<img src="${imageUrl}" alt="Image" style="max-width:100%;height:auto;border-radius:6px;margin:4px 0;" />`);
      setImageUrl('');
      setImageOpen(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        insertHTML(`<img src="${ev.target?.result}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:6px;margin:4px 0;" />`);
      };
      reader.readAsDataURL(file);
      setImageOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAttachUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      insertHTML(`<a href="#" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;color:#475569;text-decoration:none;margin:2px;">📎 ${file.name}</a>`);
      if (attachInputRef.current) attachInputRef.current.value = '';
    };

    const handleLink = () => {
      restoreRange();
      if (!linkUrl.trim()) return;
      const target = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        document.execCommand('createLink', false, linkUrl);
        if (linkNewTab) {
          editorRef.current?.querySelectorAll('a').forEach(a => {
            if (a.href.includes(linkUrl)) {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener noreferrer');
            }
          });
        }
      } else {
        const text = linkText || linkUrl;
        insertHTML(`<a href="${linkUrl}"${target} style="color:#7c3aed;text-decoration:underline;">${text}</a>`);
      }
      setLinkOpen(false);
      setLinkText(''); setLinkUrl('');
      fireChange();
    };

    const insertEmoji = (emoji: string) => {
      insertHTML(emoji);
      setEmojiOpen(false);
    };

    const insertSpecialChar = (char: string) => {
      insertHTML(char);
      setSpecialOpen(false);
    };

    const setHeading = (tag: string) => exec('formatBlock', tag);
    const setLineHeight = (lh: string) => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let container: Node | null = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
        (container as HTMLElement)?.style && ((container as HTMLElement).style.lineHeight = lh);
      }
    };

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b': e.preventDefault(); exec('bold'); break;
          case 'i': e.preventDefault(); exec('italic'); break;
          case 'u': e.preventDefault(); exec('underline'); break;
          case 'z': e.preventDefault(); exec(e.shiftKey ? 'redo' : 'undo'); break;
          case 'y': e.preventDefault(); exec('redo'); break;
          case 'a': e.preventDefault(); exec('selectAll'); break;
          case 'k': e.preventDefault(); saveRange(); setLinkOpen(true); break;
          case '`': e.preventDefault(); insertInlineCode(); break;
          case '\\': e.preventDefault(); exec('removeFormat'); break;
        }
      }
      // Tab for indent
      if (e.key === 'Tab') {
        e.preventDefault();
        exec(e.shiftKey ? 'outdent' : 'indent');
      }
      fireChange();
    };

    // ── Color pickers ──────────────────────────────────────────────────────────

    const accentRing = accentColor === 'teal' ? 'ring-teal-400' : 'ring-violet-400';
    const accentBorder = accentColor === 'teal' ? 'border-teal-500' : 'border-violet-500';

    // ── Toolbar sections ───────────────────────────────────────────────────────

    const TBtn = ({ title, children, active = false, onClick, className: cls = '' }: {
      title: string; children: React.ReactNode; active?: boolean;
      onClick: () => void; className?: string;
    }) => (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex h-7 min-w-[28px] items-center justify-center rounded px-1 text-slate-600',
          'transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40',
          active && 'bg-slate-200 text-slate-900',
          cls
        )}
      >
        {children}
      </button>
    );

    const Sep = () => <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />;

    return (
      <div className={cn('hubspot-editor-root flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white', isFocused && `ring-2 ${accentRing} border-transparent`, className)}>

        {/* ── ROW 1 TOOLBAR ── */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1.5">

          {/* Undo / Redo */}
          <TBtn title="Undo (Ctrl+Z)" onClick={() => exec('undo')}><Undo2 size={13} /></TBtn>
          <TBtn title="Redo (Ctrl+Y)" onClick={() => exec('redo')}><Redo2 size={13} /></TBtn>
          <Sep />

          {/* Font family */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onMouseDown={e => e.preventDefault()}
                className="flex h-7 items-center gap-1 rounded border border-transparent px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-200 disabled:opacity-40"
              >
                <span className="max-w-[72px] truncate">
                  {FONT_FAMILIES.find(f => f.value === currentFont)?.label ?? 'Font'}
                </span>
                <ChevronDown size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {FONT_FAMILIES.map(f => (
                <DropdownMenuItem key={f.value} onClick={() => exec('fontName', f.value)}>
                  <span style={{ fontFamily: f.value }}>{f.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Font size */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onMouseDown={e => e.preventDefault()}
                className="flex h-7 w-12 items-center justify-between rounded border border-transparent px-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-200 disabled:opacity-40"
              >
                {currentSize}
                <ChevronDown size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-20 max-h-60 overflow-y-auto">
              {FONT_SIZES.map(s => (
                <DropdownMenuItem key={s} onClick={() => { exec('fontSize', '3'); /* reset */ exec('fontSize', s); setCurrentSize(s); }}>
                  <span style={{ fontSize: `${s}px` }}>{s}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sep />

          {/* Headings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onMouseDown={e => e.preventDefault()}
                className="flex h-7 items-center gap-1 rounded border border-transparent px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <Hash size={12} /> Style
                <ChevronDown size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {['p','h1','h2','h3','h4'].map(tag => (
                <DropdownMenuItem key={tag} onClick={() => setHeading(tag)}>
                  {tag === 'p' ? <span className="text-sm">Paragraph</span> : (
                    tag === 'h1' ? <h1 className="text-lg font-black">Heading 1</h1> :
                    tag === 'h2' ? <h2 className="text-base font-bold">Heading 2</h2> :
                    tag === 'h3' ? <h3 className="text-sm font-bold">Heading 3</h3> :
                    <h4 className="text-xs font-semibold">Heading 4</h4>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => insertHTML('<blockquote style="border-left:3px solid #8b5cf6;margin:8px 0;padding:8px 12px;background:#faf5ff;color:#5b21b6;font-style:italic;border-radius:0 6px 6px 0;"><p><br></p></blockquote><p><br></p>')}>
                <span className="text-sm italic text-violet-600">❝ Blockquote</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sep />

          {/* Bold / Italic / Underline / Strike */}
          <TBtn title="Bold (Ctrl+B)" active={fmt.bold} onClick={() => exec('bold')}><Bold size={13} /></TBtn>
          <TBtn title="Italic (Ctrl+I)" active={fmt.italic} onClick={() => exec('italic')}><Italic size={13} /></TBtn>
          <TBtn title="Underline (Ctrl+U)" active={fmt.underline} onClick={() => exec('underline')}><Underline size={13} /></TBtn>
          <TBtn title="Strikethrough" active={fmt.strike} onClick={() => exec('strikeThrough')}><Strikethrough size={13} /></TBtn>
          <TBtn title="Superscript" active={fmt.super} onClick={() => exec('superscript')}><Superscript size={13} /></TBtn>
          <TBtn title="Subscript" active={fmt.sub} onClick={() => exec('subscript')}><Subscript size={13} /></TBtn>

          <Sep />

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button" title="Text Color"
                onMouseDown={e => e.preventDefault()}
                disabled={disabled}
                className="flex h-7 w-7 flex-col items-center justify-center rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <Palette size={13} className="text-slate-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Text Color</p>
              <div className="grid grid-cols-9 gap-1">
                {TEXT_COLORS.map(c => (
                  <button key={c} type="button" title={c}
                    onClick={() => exec('foreColor', c)}
                    className="h-5 w-5 rounded border border-slate-200 transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Highlight Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button" title="Highlight Color"
                onMouseDown={e => e.preventDefault()}
                disabled={disabled}
                className="flex h-7 w-7 flex-col items-center justify-center rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <Highlighter size={13} className="text-slate-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Highlight</p>
              <div className="grid grid-cols-4 gap-1.5">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c.value} type="button" title={c.label}
                    onClick={() => c.value === 'transparent' ? exec('removeFormat') : exec('hiliteColor', c.value)}
                    className={cn('h-5 w-5 rounded border transition-transform hover:scale-110', c.value === 'transparent' ? 'border-slate-300 bg-white' : 'border-slate-200')}
                    style={{ backgroundColor: c.value !== 'transparent' ? c.value : undefined }}
                  >
                    {c.value === 'transparent' && <X size={10} className="m-auto text-slate-400" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Sep />

          {/* Clear Formatting */}
          <TBtn title="Clear Formatting (Ctrl+\)" onClick={() => exec('removeFormat')}><Eraser size={13} /></TBtn>
        </div>

        {/* ── ROW 2 TOOLBAR ── */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/70 px-2 py-1">

          {/* Alignment */}
          <TBtn title="Align Left" onClick={() => exec('justifyLeft')}><AlignLeft size={13} /></TBtn>
          <TBtn title="Align Center" onClick={() => exec('justifyCenter')}><AlignCenter size={13} /></TBtn>
          <TBtn title="Align Right" onClick={() => exec('justifyRight')}><AlignRight size={13} /></TBtn>
          <TBtn title="Justify" onClick={() => exec('justifyFull')}><AlignJustify size={13} /></TBtn>

          <Sep />

          {/* Line Height */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="Line Height" disabled={disabled} onMouseDown={e => e.preventDefault()}
                className="flex h-7 items-center gap-1 rounded border border-transparent px-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16"/><path d="M9 3l-5 3 5 3"/><path d="M9 21l-5-3 5-3"/>
                </svg>
                <ChevronDown size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-28">
              {LINE_HEIGHTS.map(lh => (
                <DropdownMenuItem key={lh} onClick={() => setLineHeight(lh)}>
                  Line {lh}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Indent / Outdent */}
          <TBtn title="Outdent" onClick={() => exec('outdent')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h10M4 18h16"/><path d="M9 9l-5 3 5 3"/>
            </svg>
          </TBtn>
          <TBtn title="Indent (Tab)" onClick={() => exec('indent')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M10 12h10M4 18h16"/><path d="M4 9l5 3-5 3"/>
            </svg>
          </TBtn>

          <Sep />

          {/* Lists */}
          <TBtn title="Bullet List" active={fmt.ul} onClick={() => exec('insertUnorderedList')}><List size={13} /></TBtn>
          <TBtn title="Numbered List" active={fmt.ol} onClick={() => exec('insertOrderedList')}><ListOrdered size={13} /></TBtn>
          <TBtn title="Checklist" onClick={insertChecklist}>
            <Check size={13} />
          </TBtn>

          <Sep />

          {/* Link */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <button type="button" title="Insert Link (Ctrl+K)" disabled={disabled} onMouseDown={(e) => { e.preventDefault(); saveRange(); }}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 disabled:opacity-40">
                <Link2 size={13} className="text-slate-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Insert Link</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Link Text</Label>
                  <Input placeholder="Display text" value={linkText} onChange={e => setLinkText(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">URL</Label>
                  <Input placeholder="https://example.com" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="lt" checked={linkNewTab} onCheckedChange={c => setLinkNewTab(!!c)} />
                  <label htmlFor="lt" className="text-xs text-slate-600 cursor-pointer">Open in new tab</label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>Cancel</Button>
                  <Button size="sm" disabled={!linkUrl.trim()} onClick={handleLink} className="bg-violet-600 hover:bg-violet-700 text-white">Insert</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover open={imageOpen} onOpenChange={setImageOpen}>
            <PopoverTrigger asChild>
              <button type="button" title="Insert Image" disabled={disabled} onMouseDown={e => e.preventDefault()}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 disabled:opacity-40">
                <Image size={13} className="text-slate-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Insert Image</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Image URL</Label>
                  <div className="mt-1 flex gap-2">
                    <Input placeholder="https://…" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-8 text-sm flex-1" />
                    <Button size="sm" disabled={!imageUrl.trim()} onClick={insertImageUrl} className="bg-violet-600 hover:bg-violet-700 text-white px-3">Add</Button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-2 text-[10px] text-slate-400">or</span></div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  Upload from device
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </PopoverContent>
          </Popover>

          {/* Video */}
          <Popover open={videoOpen} onOpenChange={setVideoOpen}>
            <PopoverTrigger asChild>
              <button type="button" title="Insert Video" disabled={disabled} onMouseDown={e => e.preventDefault()}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 disabled:opacity-40">
                <Film size={13} className="text-slate-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Embed Video</h4>
              <Label className="text-xs text-slate-500">YouTube / Vimeo URL</Label>
              <div className="mt-1 flex gap-2">
                <Input placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="h-8 text-sm flex-1" />
                <Button size="sm" disabled={!videoUrl.trim()} onClick={insertVideo} className="bg-violet-600 hover:bg-violet-700 text-white px-3">Embed</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* File Attachment */}
          <button type="button" title="Attach File" disabled={disabled}
            onMouseDown={e => e.preventDefault()}
            onClick={() => attachInputRef.current?.click()}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 text-slate-600 disabled:opacity-40">
            <Paperclip size={13} />
          </button>
          <input ref={attachInputRef} type="file" className="hidden" onChange={handleAttachUpload} />

          {/* Table */}
          <Popover open={tableOpen} onOpenChange={setTableOpen}>
            <PopoverTrigger asChild>
              <button type="button" title="Insert Table" disabled={disabled} onMouseDown={e => e.preventDefault()}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 text-slate-600 disabled:opacity-40">
                <Table2 size={13} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-4" align="start">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Insert Table</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Rows</Label>
                  <Input type="number" min={1} max={20} value={tableRows} onChange={e => setTableRows(+e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Columns</Label>
                  <Input type="number" min={1} max={10} value={tableCols} onChange={e => setTableCols(+e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <Button size="sm" className="mt-3 w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={insertTable}>Insert</Button>
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <TBtn title="Insert Divider" onClick={insertDivider}><Minus size={13} /></TBtn>

          <Sep />

          {/* Code */}
          <TBtn title="Inline Code (Ctrl+`)" onClick={insertInlineCode}><Code size={13} /></TBtn>
          <TBtn title="Code Block" onClick={insertCodeBlock}><Code2 size={13} /></TBtn>

          <Sep />

          {/* Emoji */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button type="button" title="Insert Emoji" disabled={disabled} onMouseDown={e => e.preventDefault()}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 text-slate-600 disabled:opacity-40 text-sm">
                😊
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Emoji</p>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map(e => (
                  <button key={e} type="button" title={e}
                    onClick={() => insertEmoji(e)}
                    className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-slate-100 transition-colors">
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Special Characters */}
          <Popover open={specialOpen} onOpenChange={setSpecialOpen}>
            <PopoverTrigger asChild>
              <button type="button" title="Special Characters" disabled={disabled} onMouseDown={e => e.preventDefault()}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 text-slate-600 disabled:opacity-40">
                <Asterisk size={13} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Special Characters</p>
              <div className="grid grid-cols-9 gap-1">
                {SPECIAL_CHARS.map(c => (
                  <button key={c} type="button" title={c}
                    onClick={() => insertSpecialChar(c)}
                    className="flex h-7 w-7 items-center justify-center rounded text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors border border-slate-100">
                    {c}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Sep />

          {/* HTML Source View */}
          <TBtn title={htmlViewMode ? 'Switch to Visual' : 'View HTML Source'} active={htmlViewMode} onClick={toggleHtmlView}>
            {htmlViewMode ? <EyeOff size={13} /> : <Eye size={13} />}
          </TBtn>
        </div>

        {/* ── EDITOR BODY ── */}
        {htmlViewMode ? (
          <Textarea
            value={rawHtml}
            onChange={e => setRawHtml(e.target.value)}
            className="flex-1 rounded-none border-0 font-mono text-xs text-emerald-700 bg-slate-900 resize-none focus-visible:ring-0 leading-relaxed p-3"
            style={{ minHeight, maxHeight, overflowY: 'auto' }}
            placeholder="<!-- HTML source -->"
          />
        ) : (
          <div className="relative flex-1">
            <div
              ref={editorRef}
              contentEditable={!disabled}
              suppressContentEditableWarning
              onInput={fireChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={cn(
                'hubspot-editor-content outline-none overflow-y-auto px-4 py-3 text-sm text-slate-800',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{ minHeight, maxHeight }}
            />
            {isEmpty && !isFocused && !disabled && (
              <div className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400 select-none">
                {placeholder}
              </div>
            )}
          </div>
        )}

        {/* ── EDITOR STYLES ── */}
        <style>{`
          .hubspot-editor-content { line-height: 1.6; }
          .hubspot-editor-content p { margin: 0.2em 0; }
          .hubspot-editor-content h1 { font-size: 1.6em; font-weight: 800; margin: 0.5em 0 0.2em; line-height: 1.2; }
          .hubspot-editor-content h2 { font-size: 1.3em; font-weight: 700; margin: 0.5em 0 0.2em; }
          .hubspot-editor-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0 0.15em; }
          .hubspot-editor-content h4 { font-size: 1em; font-weight: 600; margin: 0.3em 0 0.1em; }
          .hubspot-editor-content blockquote { border-left:3px solid #8b5cf6;margin:8px 0;padding:8px 12px;background:#faf5ff;color:#5b21b6;font-style:italic;border-radius:0 6px 6px 0; }
          .hubspot-editor-content ul { list-style: disc; padding-left: 1.5em; margin: 0.3em 0; }
          .hubspot-editor-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.3em 0; }
          .hubspot-editor-content li { margin: 0.15em 0; }
          .hubspot-editor-content a { color: #7c3aed; text-decoration: underline; }
          .hubspot-editor-content code { background:#f1f5f9;color:#7c3aed;padding:1px 5px;border-radius:4px;font-family:'Courier New',monospace;font-size:0.875em; }
          .hubspot-editor-content pre { background:#1e293b;color:#e2e8f0;padding:12px 16px;border-radius:8px;font-family:'Courier New',monospace;font-size:13px;overflow-x:auto;margin:8px 0; }
          .hubspot-editor-content table { border-collapse:collapse;width:100%;font-size:13px;margin:8px 0; }
          .hubspot-editor-content th { border:1px solid #e2e8f0;padding:8px 12px;background:#f8fafc;font-weight:600;text-align:left; }
          .hubspot-editor-content td { border:1px solid #e2e8f0;padding:8px 12px; }
          .hubspot-editor-content hr { border:none;border-top:2px solid #e2e8f0;margin:12px 0; }
          .hubspot-editor-content img { max-width:100%;height:auto;border-radius:6px; }
        `}</style>
      </div>
    );
  }
);

HubSpotRichTextEditor.displayName = 'HubSpotRichTextEditor';
export default HubSpotRichTextEditor;
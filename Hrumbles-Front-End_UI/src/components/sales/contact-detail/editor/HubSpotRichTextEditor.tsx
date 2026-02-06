// Hrumbles-Front-End_UI/src/components/sales/contact-detail/editor/HubSpotRichTextEditor.tsx
import React, { 
  useState, 
  useRef, 
  useCallback, 
  useEffect, 
  forwardRef, 
  useImperativeHandle 
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  ChevronDown,
  List,
  ListOrdered,
  Link2,
  Image,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript,
  Superscript,
  Type,
  Palette,
  Highlighter,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================
// TYPES
// =====================

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
  initialContent?: string;
  disabled?: boolean;
}

// =====================
// CONSTANTS
// =====================

const FONT_FAMILIES = [
  { value: 'inherit', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
];

const FONT_SIZES = [
  { value: '1', label: '8', px: '10px' },
  { value: '2', label: '10', px: '13px' },
  { value: '3', label: '12', px: '16px' },
  { value: '4', label: '14', px: '18px' },
  { value: '5', label: '18', px: '24px' },
  { value: '6', label: '24', px: '32px' },
  { value: '7', label: '36', px: '48px' },
];

const TEXT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#374151', label: 'Gray 700' },
  { value: '#6B7280', label: 'Gray 500' },
  { value: '#EF4444', label: 'Red' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EAB308', label: 'Yellow' },
  { value: '#22C55E', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
];

const HIGHLIGHT_COLORS = [
  { value: 'transparent', label: 'None' },
  { value: '#FEF08A', label: 'Yellow' },
  { value: '#BBF7D0', label: 'Green' },
  { value: '#BFDBFE', label: 'Blue' },
  { value: '#FBCFE8', label: 'Pink' },
  { value: '#FED7AA', label: 'Orange' },
  { value: '#E9D5FF', label: 'Purple' },
];

// =====================
// MAIN COMPONENT
// =====================

export const HubSpotRichTextEditor = forwardRef<HubSpotEditorRef, HubSpotRichTextEditorProps>(
  ({ 
    placeholder = 'Start typing...', 
    onChange, 
    className, 
    minHeight = '150px',
    initialContent = '',
    disabled = false
  }, ref) => {
    
    // Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State
    const [isFocused, setIsFocused] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [showLinkPopover, setShowLinkPopover] = useState(false);
    const [showImagePopover, setShowImagePopover] = useState(false);
    const [linkText, setLinkText] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkNewTab, setLinkNewTab] = useState(true);
    const [savedSelection, setSavedSelection] = useState<Range | null>(null);
    
    // Active states for toolbar
    const [activeFormats, setActiveFormats] = useState({
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      subscript: false,
      superscript: false,
      orderedList: false,
      unorderedList: false,
    });
    const [currentFontFamily, setCurrentFontFamily] = useState('inherit');
    const [currentFontSize, setCurrentFontSize] = useState('3');

    // =====================
    // IMPERATIVE HANDLE
    // =====================

    useImperativeHandle(ref, () => ({
      getHTML: () => editorRef.current?.innerHTML || '',
      getText: () => editorRef.current?.textContent || '',
      isEmpty: () => {
        const text = editorRef.current?.textContent || '';
        return text.trim().length === 0;
      },
      focus: () => editorRef.current?.focus(),
      clear: () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
          setIsEmpty(true);
          onChange?.('', '');
        }
      },
      insertHTML: (html: string) => {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, html);
        handleInput();
      }
    }));

    // =====================
    // EFFECTS
    // =====================

    useEffect(() => {
      if (editorRef.current && initialContent) {
        editorRef.current.innerHTML = initialContent;
        setIsEmpty(initialContent.trim().length === 0);
      }
    }, [initialContent]);

    // =====================
    // SELECTION HELPERS
    // =====================

    const saveSelection = useCallback(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        setSavedSelection(selection.getRangeAt(0).cloneRange());
      }
    }, []);

    const restoreSelection = useCallback(() => {
      if (savedSelection) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedSelection);
      }
      editorRef.current?.focus();
    }, [savedSelection]);

    // =====================
    // FORMAT DETECTION
    // =====================

    const updateActiveFormats = useCallback(() => {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        subscript: document.queryCommandState('subscript'),
        superscript: document.queryCommandState('superscript'),
        orderedList: document.queryCommandState('insertOrderedList'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
      });

      // Get current font
      const fontName = document.queryCommandValue('fontName');
      if (fontName) {
        const found = FONT_FAMILIES.find(f => f.value.toLowerCase().includes(fontName.toLowerCase()));
        setCurrentFontFamily(found?.value || 'inherit');
      }

      // Get current font size
      const fontSize = document.queryCommandValue('fontSize');
      if (fontSize) {
        setCurrentFontSize(fontSize);
      }
    }, []);

    // =====================
    // EVENT HANDLERS
    // =====================

    const handleInput = useCallback(() => {
      const html = editorRef.current?.innerHTML || '';
      const text = editorRef.current?.textContent || '';
      setIsEmpty(text.trim().length === 0);
      onChange?.(html, text);
    }, [onChange]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
    }, []);

    const handleSelectionChange = useCallback(() => {
      if (isFocused) {
        updateActiveFormats();
      }
    }, [isFocused, updateActiveFormats]);

    const handleKeyUp = useCallback(() => {
      updateActiveFormats();
    }, [updateActiveFormats]);

    useEffect(() => {
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }, [handleSelectionChange]);

    // =====================
    // FORMATTING COMMANDS
    // =====================

    const execCommand = useCallback((command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      handleInput();
      updateActiveFormats();
    }, [handleInput, updateActiveFormats]);

    const handleBold = () => execCommand('bold');
    const handleItalic = () => execCommand('italic');
    const handleUnderline = () => execCommand('underline');
    const handleStrikethrough = () => execCommand('strikeThrough');
    const handleSubscript = () => execCommand('subscript');
    const handleSuperscript = () => execCommand('superscript');
    const handleBulletList = () => execCommand('insertUnorderedList');
    const handleNumberedList = () => execCommand('insertOrderedList');
    const handleBlockquote = () => execCommand('formatBlock', 'blockquote');
    const handleAlignLeft = () => execCommand('justifyLeft');
    const handleAlignCenter = () => execCommand('justifyCenter');
    const handleAlignRight = () => execCommand('justifyRight');
    const handleAlignJustify = () => execCommand('justifyFull');

    const handleFontFamily = (fontFamily: string) => {
      execCommand('fontName', fontFamily);
      setCurrentFontFamily(fontFamily);
    };

    const handleFontSize = (size: string) => {
      execCommand('fontSize', size);
      setCurrentFontSize(size);
    };

    const handleTextColor = (color: string) => {
      execCommand('foreColor', color);
    };

    const handleHighlightColor = (color: string) => {
      if (color === 'transparent') {
        execCommand('removeFormat');
      } else {
        execCommand('hiliteColor', color);
      }
    };

    // =====================
    // LINK HANDLING
    // =====================

    const handleOpenLinkPopover = () => {
      saveSelection();
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        setLinkText(selection.toString());
      } else {
        setLinkText('');
      }
      setLinkUrl('');
      setLinkNewTab(true);
      setShowLinkPopover(true);
    };

    const handleInsertLink = () => {
      restoreSelection();
      
      const target = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      const text = linkText || linkUrl;
      const html = `<a href="${linkUrl}"${target}>${text}</a>`;
      
      // If text was selected, we need to handle it differently
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        execCommand('createLink', linkUrl);
        // Add target attribute
        if (linkNewTab) {
          const links = editorRef.current?.querySelectorAll('a');
          links?.forEach(link => {
            if (link.href === linkUrl || link.href.endsWith(linkUrl)) {
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener noreferrer');
            }
          });
        }
      } else {
        document.execCommand('insertHTML', false, html);
      }
      
      setShowLinkPopover(false);
      setLinkText('');
      setLinkUrl('');
      handleInput();
    };

    // =====================
    // IMAGE HANDLING
    // =====================

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = `<img src="${event.target?.result}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
          editorRef.current?.focus();
          document.execCommand('insertHTML', false, img);
          handleInput();
        };
        reader.readAsDataURL(file);
      }
      setShowImagePopover(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleImageUrl = () => {
      const url = prompt('Enter image URL:');
      if (url) {
        const img = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto;" />`;
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, img);
        handleInput();
      }
      setShowImagePopover(false);
    };

    // =====================
    // RENDER
    // =====================

    return (
      <div className={cn("hubspot-editor-container", className)}>
        {/* Primary Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-300 border-b-0 rounded-t-md flex-wrap">
          {/* Bold */}
          <ToolbarButton
            icon={<Bold size={14} />}
            onClick={handleBold}
            active={activeFormats.bold}
            tooltip="Bold (Ctrl+B)"
            disabled={disabled}
          />

          {/* Italic */}
          <ToolbarButton
            icon={<Italic size={14} />}
            onClick={handleItalic}
            active={activeFormats.italic}
            tooltip="Italic (Ctrl+I)"
            disabled={disabled}
          />

          {/* Underline */}
          <ToolbarButton
            icon={<Underline size={14} />}
            onClick={handleUnderline}
            active={activeFormats.underline}
            tooltip="Underline (Ctrl+U)"
            disabled={disabled}
          />

          {/* Strikethrough */}
          <ToolbarButton
            icon={<Strikethrough size={14} />}
            onClick={handleStrikethrough}
            active={activeFormats.strikethrough}
            tooltip="Strikethrough"
            disabled={disabled}
          />

          <ToolbarDivider />

          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                disabled={disabled}
              >
                More
                <ChevronDown size={12} className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {/* Font Family */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Type size={14} className="mr-2" />
                  Font Family
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {FONT_FAMILIES.map((font) => (
                    <DropdownMenuItem 
                      key={font.value}
                      onClick={() => handleFontFamily(font.value)}
                      className={cn(currentFontFamily === font.value && "bg-blue-50")}
                    >
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Font Size */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span className="mr-2 text-xs font-bold w-4">A</span>
                  Font Size
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-32">
                  {FONT_SIZES.map((size) => (
                    <DropdownMenuItem 
                      key={size.value}
                      onClick={() => handleFontSize(size.value)}
                      className={cn(currentFontSize === size.value && "bg-blue-50")}
                    >
                      {size.label}px
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Text Color */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette size={14} className="mr-2" />
                  Text Color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color.value }}
                        onClick={() => handleTextColor(color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Highlight Color */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Highlighter size={14} className="mr-2" />
                  Highlight
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  <div className="grid grid-cols-4 gap-1 p-2">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          "w-6 h-6 rounded border hover:scale-110 transition-transform",
                          color.value === 'transparent' ? "border-gray-300 bg-white relative" : "border-gray-200"
                        )}
                        style={{ backgroundColor: color.value !== 'transparent' ? color.value : undefined }}
                        onClick={() => handleHighlightColor(color.value)}
                        title={color.label}
                      >
                        {color.value === 'transparent' && (
                          <X size={12} className="absolute inset-0 m-auto text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Superscript */}
              <DropdownMenuItem onClick={handleSuperscript}>
                <Superscript size={14} className="mr-2" />
                Superscript
              </DropdownMenuItem>

              {/* Subscript */}
              <DropdownMenuItem onClick={handleSubscript}>
                <Subscript size={14} className="mr-2" />
                Subscript
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Alignment */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <AlignLeft size={14} className="mr-2" />
                  Alignment
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={handleAlignLeft}>
                    <AlignLeft size={14} className="mr-2" />
                    Left
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAlignCenter}>
                    <AlignCenter size={14} className="mr-2" />
                    Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAlignRight}>
                    <AlignRight size={14} className="mr-2" />
                    Right
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAlignJustify}>
                    <AlignJustify size={14} className="mr-2" />
                    Justify
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Blockquote */}
              <DropdownMenuItem onClick={handleBlockquote}>
                <Quote size={14} className="mr-2" />
                Blockquote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarDivider />

          {/* Link */}
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100"
                onClick={handleOpenLinkPopover}
                disabled={disabled}
                title="Insert Link"
              >
                <Link2 size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-900">Create link</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Link text</Label>
                  <Input
                    placeholder="Enter link text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">URL</Label>
                  <Input
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="link-new-tab"
                    checked={linkNewTab}
                    onCheckedChange={(c) => setLinkNewTab(!!c)}
                  />
                  <label htmlFor="link-new-tab" className="text-sm text-gray-600 cursor-pointer">
                    Open in new tab
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowLinkPopover(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleInsertLink}
                    disabled={!linkUrl.trim()}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100"
                disabled={disabled}
                title="Insert Image"
              >
                <Image size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  onClick={handleImageUrl}
                >
                  Choose existing image
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload new
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Snippet/Document (placeholder) */}
          <ToolbarButton
            icon={<FileText size={14} />}
            onClick={() => alert('Snippets feature coming soon!')}
            tooltip="Insert Snippet"
            disabled={disabled}
          />

          <ToolbarDivider />

          {/* Bullet List */}
          <ToolbarButton
            icon={<List size={14} />}
            onClick={handleBulletList}
            active={activeFormats.unorderedList}
            tooltip="Bullet List"
            disabled={disabled}
          />

          {/* Numbered List */}
          <ToolbarButton
            icon={<ListOrdered size={14} />}
            onClick={handleNumberedList}
            active={activeFormats.orderedList}
            tooltip="Numbered List"
            disabled={disabled}
          />
        </div>

        {/* Editor Content Area */}
        <div 
          className={cn(
            "relative border border-gray-300 rounded-b-md bg-white transition-all",
            isFocused && "border-teal-500 ring-1 ring-teal-500"
          )}
        >
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            className={cn(
              "hubspot-editor-content outline-none overflow-y-auto",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ minHeight, padding: '12px 14px' }}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyUp={handleKeyUp}
            // data-placeholder={placeholder}
          />
          
          {/* Placeholder */}
          {isEmpty && !isFocused && (
            <div 
              className="absolute top-3 left-3.5 text-gray-400 pointer-events-none text-sm"
            >
              {placeholder}
            </div>
          )}
        </div>
      </div>
    );
  }
);

HubSpotRichTextEditor.displayName = 'HubSpotRichTextEditor';

// =====================
// TOOLBAR COMPONENTS
// =====================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  onClick,
  active = false,
  tooltip,
  disabled = false
}) => (
  <Button
    variant="ghost"
    size="sm"
    className={cn(
      "h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      active && "bg-gray-200 text-gray-900",
      disabled && "opacity-40 cursor-not-allowed"
    )}
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
    disabled={disabled}
    title={tooltip}
    type="button"
  >
    {icon}
  </Button>
);

const ToolbarDivider: React.FC = () => (
  <div className="w-px h-5 bg-gray-300 mx-1" />
);

export default HubSpotRichTextEditor;
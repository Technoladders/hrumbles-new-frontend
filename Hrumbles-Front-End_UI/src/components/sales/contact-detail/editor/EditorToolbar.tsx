// Hrumbles-Front-End_UI/src/components/sales/contact-detail/editor/EditorToolbar.tsx
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
  Code,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  MoreHorizontal,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onBulletList: () => void;
  onOrderedList: () => void;
  onLink: (url: string) => void;
  onSubscript?: () => void;
  onSuperscript?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  isMarkActive?: (mark: string) => boolean;
  disabled?: boolean;
}

const FONT_FAMILIES = [
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'arial', label: 'Arial' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'times', label: 'Times New Roman' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onStrikethrough,
  onBulletList,
  onOrderedList,
  onLink,
  onSubscript,
  onSuperscript,
  onUndo,
  onRedo,
  isMarkActive,
  disabled = false
}) => {
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState('sans-serif');
  const [selectedSize, setSelectedSize] = useState(11);

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      onLink(linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`);
      setLinkUrl('');
      setLinkPopoverOpen(false);
    }
  };

  return (
    <div className="border border-gray-200 border-b-0 rounded-t-lg bg-gray-50">
      {/* Main Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap">
        {/* Bold */}
        <ToolbarButton
          icon={<Bold size={14} />}
          onClick={onBold}
          active={isMarkActive?.('strong')}
          tooltip="Bold (Ctrl+B)"
          disabled={disabled}
        />

        {/* Italic */}
        <ToolbarButton
          icon={<Italic size={14} />}
          onClick={onItalic}
          active={isMarkActive?.('em')}
          tooltip="Italic (Ctrl+I)"
          disabled={disabled}
        />

        {/* Underline */}
        <ToolbarButton
          icon={<Underline size={14} />}
          onClick={onUnderline}
          active={isMarkActive?.('underline')}
          tooltip="Underline (Ctrl+U)"
          disabled={disabled}
        />

        {/* Strikethrough */}
        <ToolbarButton
          icon={<Strikethrough size={14} />}
          onClick={onStrikethrough}
          active={isMarkActive?.('strikethrough')}
          tooltip="Strikethrough"
          disabled={disabled}
        />

        {/* Divider */}
        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* More Formatting Dropdown */}
        <DropdownMenu open={showMoreTools} onOpenChange={setShowMoreTools}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs font-medium text-gray-600 hover:bg-gray-200",
                showMoreTools && "bg-gray-200"
              )}
              disabled={disabled}
            >
              More
              <ChevronDown size={12} className="ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {/* Font Family */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm">
                  <span className="text-sm">Font Family</span>
                  <span className="text-xs text-gray-500 capitalize">{selectedFont}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="w-40">
                {FONT_FAMILIES.map((font) => (
                  <DropdownMenuItem 
                    key={font.value}
                    onClick={() => setSelectedFont(font.value)}
                    className={cn(selectedFont === font.value && "bg-blue-50")}
                  >
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Font Size */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm">
                  <span className="text-sm">Font Size</span>
                  <span className="text-xs text-gray-500">{selectedSize}px</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="w-24 max-h-48 overflow-y-auto">
                {FONT_SIZES.map((size) => (
                  <DropdownMenuItem 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(selectedSize === size && "bg-blue-50")}
                  >
                    {size}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenuSeparator />

            {/* Superscript */}
            <DropdownMenuItem onClick={onSuperscript}>
              <Superscript size={14} className="mr-2" />
              Superscript
            </DropdownMenuItem>

            {/* Subscript */}
            <DropdownMenuItem onClick={onSubscript}>
              <Subscript size={14} className="mr-2" />
              Subscript
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Alignment Options */}
            <DropdownMenuItem>
              <AlignLeft size={14} className="mr-2" />
              Align Left
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AlignCenter size={14} className="mr-2" />
              Align Center
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AlignRight size={14} className="mr-2" />
              Align Right
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Code Block (disabled for calls) */}
        <ToolbarButton
          icon={<Code size={14} />}
          onClick={() => {}}
          tooltip="Code Block"
          disabled={true}
        />

        {/* Image (disabled for calls) */}
        <ToolbarButton
          icon={<Image size={14} />}
          onClick={() => {}}
          tooltip="Insert Image"
          disabled={true}
        />

        {/* Divider */}
        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Bullet List */}
        <ToolbarButton
          icon={<List size={14} />}
          onClick={onBulletList}
          tooltip="Bullet List"
          disabled={disabled}
        />

        {/* Ordered List */}
        <ToolbarButton
          icon={<ListOrdered size={14} />}
          onClick={onOrderedList}
          tooltip="Numbered List"
          disabled={disabled}
        />

        {/* Link */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              disabled={disabled}
            >
              <Link2 size={14} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Link URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8" onClick={handleLinkSubmit}>
                  Insert
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Undo/Redo */}
        {onUndo && (
          <ToolbarButton
            icon={<Undo size={14} />}
            onClick={onUndo}
            tooltip="Undo (Ctrl+Z)"
            disabled={disabled}
          />
        )}
        {onRedo && (
          <ToolbarButton
            icon={<Redo size={14} />}
            onClick={onRedo}
            tooltip="Redo (Ctrl+Y)"
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
};

// Toolbar Button Component
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
      "h-7 w-7 p-0 text-gray-600 hover:bg-gray-200 hover:text-gray-900",
      active && "bg-gray-200 text-gray-900",
      disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
    )}
    onClick={onClick}
    disabled={disabled}
    title={tooltip}
  >
    {icon}
  </Button>
);
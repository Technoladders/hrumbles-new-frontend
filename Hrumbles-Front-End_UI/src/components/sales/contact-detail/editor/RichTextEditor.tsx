// Hrumbles-Front-End_UI/src/components/sales/contact-detail/editor/RichTextEditor.tsx
import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { placeholder } from './placeholder-plugin';
import { cn } from '@/lib/utils';

// Extended schema with marks and list nodes
const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: {
    ...basicSchema.spec.marks,
    strikethrough: {
      parseDOM: [
        { tag: 's' },
        { tag: 'strike' },
        { tag: 'del' },
        { style: 'text-decoration=line-through' }
      ],
      toDOM() { return ['s', 0]; }
    },
    underline: {
      parseDOM: [
        { tag: 'u' },
        { style: 'text-decoration=underline' }
      ],
      toDOM() { return ['u', 0]; }
    },
    subscript: {
      parseDOM: [{ tag: 'sub' }],
      toDOM() { return ['sub', 0]; }
    },
    superscript: {
      parseDOM: [{ tag: 'sup' }],
      toDOM() { return ['sup', 0]; }
    }
  }
});

export interface RichTextEditorRef {
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  clear: () => void;
}

interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (html: string) => void;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ placeholder: placeholderText = 'Start typing...', onChange, className, minHeight = '120px' }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getHTML: () => {
        if (!viewRef.current) return '';
        const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(
          viewRef.current.state.doc.content
        );
        const div = document.createElement('div');
        div.appendChild(fragment);
        return div.innerHTML;
      },
      getText: () => {
        if (!viewRef.current) return '';
        return viewRef.current.state.doc.textContent;
      },
      isEmpty: () => {
        if (!viewRef.current) return true;
        const { doc } = viewRef.current.state;
        return doc.childCount === 1 && 
               doc.firstChild?.isTextblock && 
               doc.firstChild.content.size === 0;
      },
      focus: () => {
        viewRef.current?.focus();
      },
      clear: () => {
        if (!viewRef.current) return;
        const { state, dispatch } = viewRef.current;
        const tr = state.tr.delete(0, state.doc.content.size);
        dispatch(tr);
      }
    }));

    useEffect(() => {
      if (!editorRef.current) return;

      const state = EditorState.create({
        schema: mySchema,
        plugins: [
          history(),
          keymap({
            'Mod-z': undo,
            'Mod-y': redo,
            'Mod-Shift-z': redo,
            'Mod-b': toggleMark(mySchema.marks.strong),
            'Mod-i': toggleMark(mySchema.marks.em),
            'Mod-u': toggleMark(mySchema.marks.underline),
            'Mod-Shift-s': toggleMark(mySchema.marks.strikethrough),
          }),
          keymap(baseKeymap),
          dropCursor(),
          gapCursor(),
          placeholder(placeholderText),
        ]
      });

      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(transaction) {
          const newState = view.state.apply(transaction);
          view.updateState(newState);
          
          if (transaction.docChanged && onChange) {
            const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(
              newState.doc.content
            );
            const div = document.createElement('div');
            div.appendChild(fragment);
            onChange(div.innerHTML);
          }
        },
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none',
          style: `min-height: ${minHeight}; padding: 12px;`
        }
      });

      viewRef.current = view;

      return () => {
        view.destroy();
      };
    }, [placeholderText, onChange, minHeight]);

    return (
      <div 
        ref={editorRef}
        className={cn(
          "bg-white border border-gray-200 rounded-b-lg overflow-hidden",
          "focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500",
          className
        )}
      />
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

// Toolbar Command Functions
export const editorCommands = {
  toggleBold: (view: EditorView) => {
    toggleMark(mySchema.marks.strong)(view.state, view.dispatch);
    view.focus();
  },
  toggleItalic: (view: EditorView) => {
    toggleMark(mySchema.marks.em)(view.state, view.dispatch);
    view.focus();
  },
  toggleUnderline: (view: EditorView) => {
    toggleMark(mySchema.marks.underline)(view.state, view.dispatch);
    view.focus();
  },
  toggleStrikethrough: (view: EditorView) => {
    toggleMark(mySchema.marks.strikethrough)(view.state, view.dispatch);
    view.focus();
  },
  toggleSubscript: (view: EditorView) => {
    toggleMark(mySchema.marks.subscript)(view.state, view.dispatch);
    view.focus();
  },
  toggleSuperscript: (view: EditorView) => {
    toggleMark(mySchema.marks.superscript)(view.state, view.dispatch);
    view.focus();
  },
  toggleBulletList: (view: EditorView) => {
    wrapInList(mySchema.nodes.bullet_list)(view.state, view.dispatch);
    view.focus();
  },
  toggleOrderedList: (view: EditorView) => {
    wrapInList(mySchema.nodes.ordered_list)(view.state, view.dispatch);
    view.focus();
  },
  insertLink: (view: EditorView, url: string) => {
    const { from, to } = view.state.selection;
    if (from === to) return;
    
    const mark = mySchema.marks.link.create({ href: url });
    const tr = view.state.tr.addMark(from, to, mark);
    view.dispatch(tr);
    view.focus();
  },
  undo: (view: EditorView) => {
    undo(view.state, view.dispatch);
    view.focus();
  },
  redo: (view: EditorView) => {
    redo(view.state, view.dispatch);
    view.focus();
  },
  isMarkActive: (view: EditorView, markType: any) => {
    const { from, $from, to, empty } = view.state.selection;
    if (empty) {
      return !!markType.isInSet(view.state.storedMarks || $from.marks());
    }
    return view.state.doc.rangeHasMark(from, to, markType);
  }
};

export { mySchema };
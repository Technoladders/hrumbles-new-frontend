// Hrumbles-Front-End_UI/src/components/sales/contact-detail/editor/placeholder-plugin.ts
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const placeholderPluginKey = new PluginKey('placeholder');

export function placeholder(text: string): Plugin {
  return new Plugin({
    key: placeholderPluginKey,
    props: {
      decorations(state) {
        const { doc } = state;
        
        // Check if document is empty
        if (doc.childCount === 1 && 
            doc.firstChild?.isTextblock && 
            doc.firstChild.content.size === 0) {
          
          const decoration = Decoration.node(0, doc.firstChild.nodeSize, {
            class: 'is-empty',
            'data-placeholder': text
          });
          
          return DecorationSet.create(doc, [decoration]);
        }
        
        return DecorationSet.empty;
      }
    }
  });
}
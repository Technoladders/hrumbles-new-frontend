import { useRef, useMemo, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import BetterTable from "quill-better-table";
import "react-quill-new/dist/quill.snow.css";
import "./styles.css";

interface QuillTableBetterDemoProps {
  value: string;
  onChange: (value: string) => void;
}

const QuillTableBetterDemo: React.FC<QuillTableBetterDemoProps> = ({
  value,
  onChange,
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Register BetterTable module (no changes here)
  useEffect(() => {
    Quill.register({ "modules/better-table": BetterTable }, true);
  }, []);

  // --- UPDATED AND REORGANIZED TOOLBAR ---
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          // Group 1: Font and Size
          [{ font: [] }, { size: ["small", false, "large", "huge"] }],
          // Group 2: Text Style
          ["bold", "italic", "underline", "strike"],
          // Group 3: Color and Background
          [{ color: [] }, { background: [] }],
          // Group 4: Headers and Alignment
          [{ header: 1 }, { header: 2 }, { align: [] }],
          // Group 5: Lists and Indentation
          [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
          // Group 6: Links, Images, and Tables
          ["link", "image", "table"],
          // Group 7: RTL Direction (optional, can be removed if not needed)
          [{ direction: "rtl" }],
        ],
      },
      table: false, // Keep BetterTable config as is
      "better-table": {
        operationMenu: {
          items: {
            insertRowBelow: { text: "Insert Row Below" },
            insertRowAbove: { text: "Insert Row Above" },
            insertColumnRight: { text: "Insert Column Right" },
            insertColumnLeft: { text: "Insert Column Left" },
            deleteRow: { text: "Delete Row" },
            deleteColumn: { text: "Delete Column" },
            deleteTable: { text: "Delete Table" },
          },
        },
      },
      keyboard: {
        bindings: BetterTable.keyboardBindings,
      },
    }),
    []
  );

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
    />
  );
};

export default QuillTableBetterDemo;
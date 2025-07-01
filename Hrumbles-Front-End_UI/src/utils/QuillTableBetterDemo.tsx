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

  // Register BetterTable module
  useEffect(() => {
    Quill.register({ "modules/better-table": BetterTable }, true);
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: 1 }, { header: 2 }],
          ["bold", "italic", "underline", "strike"],
          ["link", "image"],
          [{ list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ direction: "rtl" }],
          [{ size: ["small", false, "large", "huge"] }],
          [{ color: [] }, { background: [] }],
          [{ font: [] }],
          [{ align: [] }],
          ["table"],
        ],
      },
      table: false,
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
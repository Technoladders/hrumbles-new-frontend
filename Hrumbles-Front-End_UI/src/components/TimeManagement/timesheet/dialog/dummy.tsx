// TimeEditor for tiptap


import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TimeLog } from "@/types/time-tracker-types";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from 'date-fns';
import { Bold, Italic, List, ListOrdered, Table as TableIcon, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, Calendar } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import './styles.css';

interface TimesheetEditFormProps {
  timesheet?: TimeLog;
  editedTimesheet?: TimeLog;
  setEditedTimesheet?: (timesheet: TimeLog) => void;
  formData: {
    workReport: string;
    projectAllocations: any[];
  };
  setFormData: (formData: {
    workReport: string;
    projectAllocations: any[];
  }) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface Submission {
  job_title: string;
  client_owner: string;
  candidate_name: string;
  status: string;
}

const MenuBar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const insertInterviewScheduleTable = () => {
    const tableContent = `
      <table class="timesheet-table" style="border: 1px solid #ccc; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #ccc; padding: 8px;">Date</th>
            <th style="border: 1px solid #ccc; padding: 8px;">Candidate Name</th>
            <th style="border: 1px solid #ccc; padding: 8px;">Skill / Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">4/6/2025</td>
            <td style="border: 1px solid #ccc; padding: 8px;">Tabassum Nazneen</td>
            <td style="border: 1px solid #ccc; padding: 8px;">ETL Talend</td>
          </tr>
        </tbody>
      </table>
    `;
    editor.chain().focus().insertContent(tableContent).run();
  };

  return (
    <div className="flex gap-2 mb-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className="border-gray-200 hover:bg-gray-50"
        title="Insert Table"
      >
        <TableIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={insertInterviewScheduleTable}
        className="border-gray-200 hover:bg-gray-50"
        title="Insert Interview Schedule"
      >
        <Calendar className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : 'border-gray-200 hover:bg-gray-50'}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const TimesheetEditForm: React.FC<TimesheetEditFormProps> = ({
  timesheet,
  editedTimesheet,
  setEditedTimesheet,
  formData,
  setFormData,
  onValidationChange,
}) => {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [workReportError, setWorkReportError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsInserted, setSubmissionsInserted] = useState(false);

  const { user, role } = useSelector((state: any) => state.auth);
  const userId = user?.id;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'timesheet-table',
          style: 'border: 1px solid #ccc; border-collapse: collapse;',
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          style: 'border: 1px solid #ccc; padding: 8px;',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: formData.workReport || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const strippedContent = editor.getText().trim();
      validateWorkReport(strippedContent);
      setFormData({ ...formData, workReport: html });

      if (editedTimesheet && setEditedTimesheet) {
        let parsedNotes = {};
        if (typeof editedTimesheet.notes === 'string') {
          try {
            parsedNotes = JSON.parse(editedTimesheet.notes);
          } catch {
            // Fallback to empty object
          }
        }
        setEditedTimesheet({
          ...editedTimesheet,
          notes: JSON.stringify({
            ...parsedNotes,
            workReport: html,
          }),
        });
      }
    },
  });

  // Helper function to safely extract values from notes
  const getNotesValue = (key: string): string => {
    if (key === 'workReport' && formData?.workReport !== undefined) {
      return formData.workReport;
    }
    const targetObject = editedTimesheet || timesheet;
    if (!targetObject) return '';
    if (typeof targetObject.notes === 'string') {
      try {
        const parsedNotes = JSON.parse(targetObject.notes);
        return parsedNotes[key] || '';
      } catch {
        return '';
      }
    }
    if (typeof targetObject.notes === 'object' && targetObject.notes !== null) {
      return (targetObject.notes as Record<string, any>)[key] || '';
    }
    return '';
  };

  // Fetch department name to determine if user is a recruiter
  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!userId) return;

      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", userId)
          .single();

        if (employeeError) throw employeeError;
        if (!employeeData?.department_id) return;

        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;

        if (role === "employee" && departmentData.name === "Human Resource") {
          setIsRecruiter(true);
        }
      } catch (error) {
        console.error("Error fetching department:", error);
      }
    };

    fetchDepartmentName();
  }, [userId, role]);

  // Fetch candidate submissions and insert into editor for recruiters
// Fetch candidate submissions and insert into editor for recruiters
useEffect(() => {
  if (!isRecruiter || !userId || submissionsInserted || !editor) return;

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const { data: candidates, error } = await supabase
        .from("hr_job_candidates")
        .select(`
          name,
          status,
          created_at,
          job_id,
          hr_jobs!hr_job_candidates_job_id_fkey(
            title,
            client_owner
          )
        `)
        .eq("created_by", userId)
        .gte("created_at", format(todayStart, "yyyy-MM-dd'T'HH:mm:ss"))
        .lte("created_at", format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss"));

      if (error) throw error;

      const formattedSubmissions: Submission[] = candidates.map((candidate: any) => ({
        job_title: candidate.hr_jobs?.title || 'N/A',
        client_owner: candidate.hr_jobs?.client_owner || 'N/A',
        candidate_name: candidate.name,
        status: candidate.status,
      }));

      setSubmissions(formattedSubmissions);

      if (formattedSubmissions.length > 0) {
        const currentContent = editor.getHTML();
        if (!currentContent.includes('timesheet-table')) {
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'table',
              attrs: {
                class: 'timesheet-table',
                style: 'border: 1px solid #ccc; border-collapse: collapse;',
              },
              content: [
                {
                  type: 'tableRow',
                  content: [
                    {
                      type: 'tableHeader',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px; background-color: #f0f0f0;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Job Title' }] }],
                    },
                    {
                      type: 'tableHeader',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px; background-color: #f0f0f0;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Client Owner' }] }],
                    },
                    {
                      type: 'tableHeader',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px; background-color: #f0f0f0;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Candidate Name' }] }],
                    },
                    {
                      type: 'tableHeader',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px; background-color: #f0f0f0;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Status' }] }],
                    },
                  ],
                },
                ...formattedSubmissions.map(sub => ({
                  type: 'tableRow',
                  content: [
                    {
                      type: 'tableCell',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: sub.job_title }] }],
                    },
                    {
                      type: 'tableCell',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: sub.client_owner }] }],
                    },
                    {
                      type: 'tableCell',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: sub.candidate_name }] }],
                    },
                    {
                      type: 'tableCell',
                      attrs: { style: 'border: 1px solid #ccc; padding: 8px;' },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: sub.status }] }],
                    },
                  ],
                })),
              ],
            })
            .insertContent({
              type: 'paragraph',
              content: [{ type: 'text', text: `Total Submissions: ${formattedSubmissions.length}` }],
            })
            .run();
          setSubmissionsInserted(true);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  fetchSubmissions();
}, [isRecruiter, userId, submissionsInserted, editor]);

  // Initialize form fields
  useEffect(() => {
    const initialTitle = getNotesValue('title');
    const initialWorkReport = getNotesValue('workReport');
    setTitle(initialTitle);
    validateTitle(initialTitle);
    validateWorkReport(initialWorkReport);
    if (editor && initialWorkReport) {
      editor.commands.setContent(initialWorkReport);
    }
  }, [editedTimesheet, timesheet, editor]);

  // Validate title
  const validateTitle = (title: string) => {
    const isValid = title.trim().length > 0;
    setTitleError(isValid ? null : 'Title is required');
    updateFormValidity(isValid, workReportError === null);
    return isValid;
  };

  // Validate workReport
  const validateWorkReport = (workReport: string) => {
    const isValid = workReport.trim().length > 0;
    setWorkReportError(isValid ? null : 'Work Summary is required');
    updateFormValidity(titleError === null, isValid);
    return isValid;
  };

  // Update parent component on validation change
  const updateFormValidity = (isTitleValid: boolean, isWorkReportValid: boolean) => {
    if (onValidationChange) {
      onValidationChange(isTitleValid && isWorkReportValid);
    }
  };

  // Handle title change
  const handleTitleChange = (value: string) => {
    setTitle(value);
    validateTitle(value);

    if (editedTimesheet && setEditedTimesheet) {
      let parsedNotes = {};
      if (typeof editedTimesheet.notes === 'string') {
        try {
          parsedNotes = JSON.parse(editedTimesheet.notes);
        } catch {
          // Fallback to empty object
        }
      }
      setEditedTimesheet({
        ...editedTimesheet,
        notes: JSON.stringify({
          ...parsedNotes,
          title: value,
        }),
      });
    }
  };

  // Calculate total working hours
  const targetTimesheet = editedTimesheet || timesheet;
  const calculatedWorkingHours = targetTimesheet?.duration_minutes
    ? (targetTimesheet.duration_minutes / 60).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Timesheet Title"
          className={`mb-3 ${titleError ? 'border-red-500' : ''}`}
        />
        {titleError && (
          <p className="text-red-500 text-sm mt-1">{titleError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="totalWorkingHours">Total Working Hours</Label>
        <Input
          id="totalWorkingHours"
          type="number"
          value={calculatedWorkingHours}
          readOnly
          className="mb-3"
        />
      </div>

      <div>
        <Label htmlFor="workReport">
          Work Summary <span className="text-red-500">*</span>
        </Label>
        <div className={`border rounded-md ${workReportError ? 'border-red-500' : 'border-gray-200'} p-2`}>
          <MenuBar editor={editor} />
          <EditorContent editor={editor} className="tiptap min-h-[200px]" />
        </div>
        {workReportError && (
          <p className="text-red-500 text-sm mt-1">{workReportError}</p>
        )}
        {loadingSubmissions && (
          <div className="flex justify-center p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>
    </div>
  );
};

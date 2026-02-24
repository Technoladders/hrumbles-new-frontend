// src/components/candidates/talent-pool/ResumeViewer.tsx
// Provides highlighted text view + original PDF view toggle
// Highlighting inside iframes is impossible due to browser security.
// This component displays the stored resume_text with highlighting,
// and allows toggling to the original document view.

import { FC, useMemo, useState } from 'react';
import { FileText, Eye, Type, Download, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const escapeRegExp = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface ResumeViewerProps {
  resumePath: string | null;
  resumeText: string | null;
  highlightTerms: string[];
  hasExportPermission?: boolean;
}

const ResumeViewer: FC<ResumeViewerProps> = ({
  resumePath,
  resumeText,
  highlightTerms,
  hasExportPermission = false,
}) => {
  const [viewMode, setViewMode] = useState<'highlighted' | 'original'>(
    highlightTerms.length > 0 && resumeText ? 'highlighted' : 'original'
  );
  const [expanded, setExpanded] = useState(false);

  // Build highlighted HTML from resume text
  const highlightedHtml = useMemo(() => {
    if (!resumeText || !highlightTerms.length) return resumeText || '';

    const sorted = [...highlightTerms].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(escapeRegExp);
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

    // Escape HTML entities first, then apply highlights
    const escapeHtml = (text: string) =>
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const lines = resumeText.split('\n');
    return lines
      .map((line) => {
        const escaped = escapeHtml(line);
        return escaped.replace(
          regex,
          '<mark class="rv-mark">$1</mark>'
        );
      })
      .join('<br/>');
  }, [resumeText, highlightTerms]);

  // Match count
  const matchCount = useMemo(() => {
    if (!resumeText || !highlightTerms.length) return 0;
    const sorted = [...highlightTerms].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(escapeRegExp);
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    return (resumeText.match(regex) || []).length;
  }, [resumeText, highlightTerms]);

  const renderOriginalEmbed = () => {
    if (!resumePath) return null;
    const fileUrl = resumePath;
    const extension = fileUrl.split(/[#?]/)[0].split('.').pop()?.trim().toLowerCase() || '';

    if (extension === 'pdf') {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          className="w-full rounded-lg border-0"
          style={{ height: expanded ? '90vh' : '700px' }}
          title="Resume PDF"
        />
      );
    }

    if (['jpg', 'jpeg', 'png'].includes(extension)) {
      return (
        <img
          src={fileUrl}
          alt="Resume"
          className="w-full h-auto rounded-lg"
        />
      );
    }

    return (
      <iframe
        src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
        className="w-full rounded-lg border-0"
        style={{ height: expanded ? '90vh' : '700px' }}
        title="Resume Document"
      />
    );
  };

  if (!resumePath && !resumeText) return null;

  return (
    <>
      <style>{`
        .rv-container {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        .rv-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }
        .rv-toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rv-toolbar-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rv-tab-group {
          display: flex;
          background: #E5E7EB;
          border-radius: 8px;
          padding: 2px;
        }
        .rv-tab {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          background: transparent;
          color: #6B7280;
        }
        .rv-tab.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }
        .rv-tab svg {
          width: 14px;
          height: 14px;
        }
        .rv-match-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          background: #FEF3C7;
          color: #92400E;
        }
        .rv-text-view {
          padding: 24px 32px;
          max-height: 700px;
          overflow-y: auto;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.8;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .rv-text-view.expanded {
          max-height: 90vh;
        }
        .rv-mark {
          background: linear-gradient(120deg, #FDE68A 0%, #FCD34D 100%);
          color: #78350F;
          padding: 1px 3px;
          border-radius: 3px;
          font-weight: 600;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        .rv-original-view {
          padding: 8px;
          background: #F3F4F6;
        }
        .rv-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #E5E7EB;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          color: #6B7280;
        }
        .rv-icon-btn:hover {
          border-color: #DDD6FE;
          color: #6C2BD9;
          background: #F5F0FF;
        }

        /* Custom scrollbar */
        .rv-text-view::-webkit-scrollbar { width: 6px; }
        .rv-text-view::-webkit-scrollbar-track { background: transparent; }
        .rv-text-view::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 10px;
        }
        .rv-text-view::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
      `}</style>

      <div className="rv-container">
        {/* Toolbar */}
        <div className="rv-toolbar">
          <div className="rv-toolbar-left">
            {/* Tab toggle - only show if both views are available */}
            {resumeText && resumePath && (
              <div className="rv-tab-group">
                <button
                  className={cn('rv-tab', viewMode === 'highlighted' && 'active')}
                  onClick={() => setViewMode('highlighted')}
                >
                  <Type /> Text
                  {matchCount > 0 && (
                    <span className="rv-match-badge">{matchCount} matches</span>
                  )}
                </button>
                <button
                  className={cn('rv-tab', viewMode === 'original' && 'active')}
                  onClick={() => setViewMode('original')}
                >
                  <Eye /> Original
                </button>
              </div>
            )}
            {/* If only one view available, show label */}
            {!resumeText && resumePath && (
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" /> Resume
              </span>
            )}
          </div>

          <div className="rv-toolbar-right">
            <button
              className="rv-icon-btn"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {resumePath && !hasExportPermission && (
              <button
                className="rv-icon-btn"
                onClick={() => window.open(resumePath, '_blank')}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {viewMode === 'highlighted' && resumeText ? (
          <div
            className={cn('rv-text-view', expanded && 'expanded')}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : resumePath ? (
          <div className="rv-original-view">
            {renderOriginalEmbed()}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No resume available
          </div>
        )}
      </div>
    </>
  );
};

export default ResumeViewer;
import React from 'react';
import { FileText, FileSpreadsheet, Presentation, Trash2 } from 'lucide-react';
import { useFetch } from '../../../hooks/useFetch';
import api from '../../../services/api';

const FILE_ICON = {
  pdf:  { icon: FileText,        color: 'text-red-400' },
  docx: { icon: FileText,        color: 'text-blue-400' },
  doc:  { icon: FileText,        color: 'text-blue-400' },
  pptx: { icon: Presentation,    color: 'text-orange-400' },
  ppt:  { icon: Presentation,    color: 'text-orange-400' },
  xlsx: { icon: FileSpreadsheet, color: 'text-green-500' },
  xls:  { icon: FileSpreadsheet, color: 'text-green-500' },
  csv:  { icon: FileSpreadsheet, color: 'text-teal-500' },
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const RecentDocumentsList = ({ refreshTrigger }) => {
  const { data: docs, refetch } = useFetch('/documents', {}, [refreshTrigger]);
  const documents = docs || [];

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    try {
      await api.delete(`/documents/${docId}`);
      refetch();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  if (documents.length === 0) return null;

  return (
    <div>
      <h3 className="text-[#1a1a1a] text-[13px] font-medium tracking-wide mb-3 px-2 uppercase">
        Documents
      </h3>
      <div className="bg-white/50 backdrop-blur-md rounded-[2rem] py-2 shadow-sm max-h-[280px] overflow-y-auto no-scrollbar">
        {documents.map((doc, idx) => {
          const config = FILE_ICON[doc.fileType] || { icon: FileText, color: 'text-gray-400' };
          const Icon   = config.icon;
          const isLast = idx === documents.length - 1;

          return (
            <div
              key={doc._id}
              className={`group flex items-center gap-3 py-2 px-3 hover:bg-white/40 rounded-[2rem] transition-colors cursor-pointer ${!isLast ? 'border-b border-black/5' : ''}`}
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <Icon className={`w-[20px] h-[20px] ${config.color}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#1a1a1a] font-medium text-[14px] truncate leading-tight">{doc.title}</p>
                <p className="text-gray-400 text-[11px] leading-tight">
                  {doc.fileType?.toUpperCase()} · {formatDate(doc.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, doc._id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400"
                title="Delete document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentDocumentsList;

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isUser = false }) => {
  return (
    <div className={`text-xs leading-relaxed ${isUser ? 'text-white' : 'text-slate-800'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ children }) => (
            <strong
              className={`font-bold ${
                isUser ? 'text-white font-extrabold' : 'text-slate-950 font-bold'
              }`}
              style={{ fontWeight: 700 }}
            >
              {children}
            </strong>
          ),
          b: ({ children }) => (
            <strong
              className={`font-bold ${
                isUser ? 'text-white font-extrabold' : 'text-slate-950 font-bold'
              }`}
              style={{ fontWeight: 700 }}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-1.5 space-y-1 pl-4 list-disc marker:text-purple-500">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 space-y-1 pl-4 list-decimal marker:text-purple-600 font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          code: ({ children }) => (
            <code
              className={`font-mono px-1 py-0.5 rounded text-[11px] ${
                isUser
                  ? 'bg-purple-700/60 text-white'
                  : 'bg-purple-50 text-purple-900 border border-purple-200'
              }`}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-purple-400 pl-2.5 my-1.5 italic text-slate-600">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

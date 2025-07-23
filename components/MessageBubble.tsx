import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { User, Bot } from "lucide-react";

export const MessageBubble = ({
  message,
  isUser,
}: {
  message: { role: string; content: string };
  isUser: boolean;
}) => {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {/* Left side icon for Bot */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold mr-2">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={clsx(
          "max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-sm",
          isUser
            ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-md"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
        )}
      >
        <ReactMarkdown
          components={{
            p: ({ node, ...props }) => (
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul
                className="list-disc pl-5 text-sm leading-relaxed"
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol
                className="list-decimal pl-5 text-sm leading-relaxed"
                {...props}
              />
            ),
            strong: ({ node, ...props }) => (
              <strong className="font-semibold" {...props} />
            ),
            a: ({ node, ...props }) => (
              <a
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Right side icon for User */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-purple-700 flex items-center justify-center font-bold ml-2">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

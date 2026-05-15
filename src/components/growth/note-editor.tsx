"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Quote, Heading2 } from "lucide-react";

interface Props {
  initialContent?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}

export function NoteEditor({ initialContent = "", onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    immediatelyRender: false
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== initialContent && !editor.isFocused) {
      editor.commands.setContent(initialContent || "");
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="border rounded-lg bg-card">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote className="h-4 w-4" /></ToolbarButton>
        </div>
      )}
      <div className="p-3 prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="icon" onClick={onClick} className="h-8 w-8">
      {children}
    </Button>
  );
}

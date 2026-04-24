"use client";
import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
  /** Current image URL (for preview) */
  value: string;
  /** Called with the new URL after successful upload, or "" on clear */
  onChange: (url: string) => void;
  /** Storage folder name: "services" | "staff" */
  folder: string;
  /** Admin password for auth header */
  pw: string;
  /** Optional label text */
  label?: string;
  /** CSS class for the wrapper */
  className?: string;
}

export default function ImageUpload({ value, onChange, folder, pw, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("ไฟล์ใหญ่เกิน 5 MB");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-password": pw },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "อัปโหลดล้มเหลว");
        return;
      }
      onChange(data.url);
    } catch {
      setError("เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="w-24 h-24 rounded-xl object-cover border border-ink-200"
          />
          <button
            type="button"
            onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
            title="ลบรูป"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-24 h-24 rounded-xl border-2 border-dashed border-ink-300 flex flex-col items-center justify-center cursor-pointer hover:border-ink-500 hover:bg-ink-50 transition-colors"
        >
          {uploading ? (
            <div className="text-xs text-ink-500 text-center">กำลัง<br />อัปโหลด...</div>
          ) : (
            <>
              <Upload size={20} className="text-ink-400" />
              <span className="text-xs text-ink-400 mt-1">อัปโหลด</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

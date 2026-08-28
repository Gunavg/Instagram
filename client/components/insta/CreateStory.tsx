"use client";

import { useRef, useState } from "react";
import axiosInstance from "@/lib/axios";
import { X, Upload, Image as ImageIcon, Video } from "lucide-react";

interface CreateStoryProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

type SelectedMedia = {
  file: File;
  preview: string;
  type: "image" | "video";
};

export default function CreateStory({
  open,
  onClose,
  onCreated,
}: CreateStoryProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    setError("");

    const selectedFiles = Array.from(files);

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    const invalidFile = selectedFiles.find(
      (file) => !allowedTypes.includes(file.type),
    );

    if (invalidFile) {
      setError(
        `${invalidFile.name} is not a supported image or video file.`,
      );
      return;
    }

    if (media.length + selectedFiles.length > 10) {
      setError("You can upload a maximum of 10 media files.");
      return;
    }

    const newMedia: SelectedMedia[] = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/")
        ? "video"
        : "image",
    }));

    setMedia((prev) => [...prev, ...newMedia]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => {
      const item = prev[index];

      if (item) {
        URL.revokeObjectURL(item.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreateStory = async () => {
    if (media.length === 0) {
      setError("Please select at least one image or video.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();

      media.forEach((item) => {
        formData.append("media", item.file);
      });

      /*
       * IMPORTANT:
       * Send the story only ONCE.
       *
       * The backend middleware receives the files,
       * uploads them, and creates the story.
       */
      const response =await axiosInstance.post("/api/stories", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Story creation failed",
        );
      }

      media.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });

      setMedia([]);

      await onCreated?.();

      onClose();
    } catch (error: any) {
      console.error("Story creation error:", error);

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create story. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;

    media.forEach((item) => {
      URL.revokeObjectURL(item.preview);
    });

    setMedia([]);
    setError("");

    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-ig-surface rounded-xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border">
          <h2 className="font-semibold text-ig-text">
            Create Story
          </h2>

          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-full hover:bg-ig-hover disabled:opacity-50"
            type="button"
          >
            <X size={22} className="text-ig-text" />
          </button>
        </div>

        {/* Upload area */}
        <div className="p-4">
          {media.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-ig-border rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-ig-hover transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-ig-hover flex items-center justify-center">
                <Upload
                  size={26}
                  className="text-ig-text"
                />
              </div>

              <div className="text-center">
                <p className="font-semibold text-ig-text">
                  Add to your story
                </p>

                <p className="text-sm text-ig-secondary mt-1">
                  Select images or videos
                </p>
              </div>
            </button>
          ) : (
            <div>
              {/* Preview grid */}
              <div className="grid grid-cols-2 gap-3">
                {media.map((item, index) => (
                  <div
                    key={`${item.file.name}-${index}`}
                    className="relative aspect-9/12 rounded-lg overflow-hidden bg-black"
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.preview}
                        alt={`Story media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.preview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        controls={false}
                      />
                    )}

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X
                        size={16}
                        className="text-white"
                      />
                    </button>

                    {/* Media type */}
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 flex items-center gap-1">
                      {item.type === "image" ? (
                        <ImageIcon
                          size={13}
                          className="text-white"
                        />
                      ) : (
                        <Video
                          size={13}
                          className="text-white"
                        />
                      )}

                      <span className="text-xs text-white">
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add more */}
              {media.length < 10 && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 w-full py-3 rounded-lg border border-ig-border text-sm font-semibold text-ig-text hover:bg-ig-hover"
                >
                  + Add more media
                </button>
              )}
            </div>
          )}

          {/* File input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);

              // Allows selecting the same file again.
              event.target.value = "";
            }}
          />

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-500">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-ig-border">
          <button
            type="button"
            onClick={handleCreateStory}
            disabled={loading || media.length === 0}
            className="w-full py-3 rounded-lg bg-[#0095f6] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1877f2] transition-colors"
          >
            {loading ? "Sharing..." : "Share Story"}
          </button>
        </div>
      </div>
    </div>
  );
}
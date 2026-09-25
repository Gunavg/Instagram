"use client";

import {
  useRef,
  useState,
} from "react";
import axiosInstance from "@/lib/axios";
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Shield,
  Users,
  UserRound,
  Plus,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";

interface CreateStoryProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

type StoryPrivacy =
  | "public"
  | "followers"
  | "close_friends";

type SelectedMedia = {
  file: File;
  preview: string;
  type: "image" | "video";
};

const privacyOptions: Array<{
  value: StoryPrivacy;
  label: string;
  description: string;
  icon: typeof Shield;
}> = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can view your story",
    icon: Shield,
  },
  {
    value: "followers",
    label: "Followers",
    description: "Only your followers can view",
    icon: Users,
  },
  {
    value: "close_friends",
    label: "Close Friends",
    description: "Only your close friends can view",
    icon: UserRound,
  },
];

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

export default function CreateStory({
  open,
  onClose,
  onCreated,
}: CreateStoryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [privacy, setPrivacy] =
    useState<StoryPrivacy>("public");
  const [media, setMedia] =
    useState<SelectedMedia[]>([]);
  const [activeIndex, setActiveIndex] =
    useState(0);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");


  if (!open) {
    return null;
  }

  const handleFiles = (
    files: FileList | null
  ) => {
    if (!files) {
      return;
    }

    setError("");

    const selectedFiles =
      Array.from(files);

    const invalidFile =
      selectedFiles.find(
        (file) =>
          !allowedTypes.includes(
            file.type
          )
      );

    if (invalidFile) {
      setError(
        `${invalidFile.name} is not a supported image or video file.`
      );
      return;
    }

    if (
      media.length +
        selectedFiles.length >
      10
    ) {
      setError(
        "You can upload a maximum of 10 media files."
      );
      return;
    }

    const newMedia =
      selectedFiles.map(
        (file) => ({
          file,
          preview:
            URL.createObjectURL(
              file
            ),
          type: file.type.startsWith(
            "video/"
          )
            ? ("video" as const)
            : ("image" as const),
        })
      );

    setMedia((previous) => [
      ...previous,
      ...newMedia,
    ]);

    if (media.length === 0) {
      setActiveIndex(0);
    }
  };

  const removeMedia = (
    index: number
  ) => {
    setMedia((previous) => {
      const item = previous[index];

      if (item) {
        URL.revokeObjectURL(
          item.preview
        );
      }

      const next = previous.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

      setActiveIndex((current) => {
        if (next.length === 0) {
          return 0;
        }

        return Math.min(
          current,
          next.length - 1
        );
      });

      return next;
    });
  };

  const handleCreateStory =
    async () => {
      if (media.length === 0) {
        setError(
          "Please select at least one image or video."
        );
        return;
      }

      try {
        setLoading(true);
        setError("");

        const formData =
          new FormData();

        media.forEach((item) => {
          formData.append(
            "media",
            item.file
          );
        });

        formData.append(
          "privacy",
          privacy
        );

        const response =
          await axiosInstance.post(
            "/api/stories",
            formData
          );

        if (
          response.data?.success ===
          false
        ) {
          throw new Error(
            response.data?.message ||
              "Story creation failed"
          );
        }

        media.forEach((item) =>
          URL.revokeObjectURL(
            item.preview
          )
        );

        setMedia([]);
        setActiveIndex(0);

        await onCreated?.();
        onClose();
      } catch (requestError: any) {
        console.error(
          "Story creation error:",
          requestError
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Failed to create story. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleClose = () => {
    if (loading) {
      return;
    }

    media.forEach((item) =>
      URL.revokeObjectURL(
        item.preview
      )
    );

    setMedia([]);
    setActiveIndex(0);
    setPrivacy("public");
    setError("");
    onClose();
  };

  const activeMedia =
    media[activeIndex];

  return (
    <div
      className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Create Story"
    >
      <div className="relative w-full max-w-6xl h-[min(92vh,760px)] bg-ig-surface border border-ig-border rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* HEADER */}
        <header className="h-16 shrink-0 px-4 sm:px-6 border-b border-ig-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#feda75] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center">
              <Sparkles
                size={18}
                className="text-white"
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-ig-text">
                Create Story
              </h2>
              <p className="hidden sm:block text-xs text-ig-muted">
                Share a moment that disappears after 24 hours
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-9 h-9 rounded-full flex items-center justify-center text-ig-text hover:bg-ig-hover transition-colors disabled:opacity-50"
            aria-label="Close create story"
          >
            <X size={21} />
          </button>
        </header>

        {/* CONTENT */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* PREVIEW */}
          <section className="flex-1 min-h-0 bg-black/5 dark:bg-black/20 p-4 sm:p-6 flex items-center justify-center">
            {activeMedia ? (
              <div className="relative h-full max-h-155 aspect-9/16 rounded-2xl overflow-hidden bg-black shadow-2xl">
                {activeMedia.type ===
                "image" ? (
                  <img
                    src={activeMedia.preview}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={activeMedia.preview}
                    className="w-full h-full object-cover"
                    muted
                    controls
                    playsInline
                  />
                )}

                {/* INSTAGRAM-STYLE OVERLAY */}
                <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
                  <div className="flex gap-1">
                    {media.map(
                      (_, index) => (
                        <div
                          key={index}
                          className="h-1 flex-1 rounded-full bg-white/35 overflow-hidden"
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              index ===
                              activeIndex
                                ? "w-full bg-white"
                                : index <
                                    activeIndex
                                  ? "w-full bg-white/80"
                                  : "w-0"
                            }`}
                          />
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                      <UserRound
                        size={15}
                        className="text-white"
                      />
                    </div>

                    <span className="text-xs font-semibold text-white">
                      Your story
                    </span>

                    <span className="text-[11px] text-white/70">
                      • 24h
                    </span>
                  </div>
                </div>

                <div className="absolute left-3 bottom-3 px-2.5 py-1.5 rounded-full bg-black/55 backdrop-blur-sm flex items-center gap-1.5">
                  {activeMedia.type ===
                  "image" ? (
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

                  <span className="text-[11px] text-white capitalize">
                    {activeMedia.type}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  inputRef.current?.click()
                }
                className="h-full max-h-155 aspect-9/16 w-full max-w-87.5 rounded-2xl border-2 border-dashed border-ig-border bg-ig-surface hover:bg-ig-hover transition-all flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-[#feda75] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center mb-5 shadow-lg">
                  <Upload
                    size={28}
                    className="text-white"
                  />
                </div>

                <h3 className="text-lg font-semibold text-ig-text">
                  Add photos or videos
                </h3>

                <p className="text-sm text-ig-muted mt-2 max-w-57.5">
                  Choose up to 10 photos or videos to create your story.
                </p>

                <span className="mt-5 px-5 py-2.5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold hover:bg-[#1877f2] transition-colors">
                  Choose from device
                </span>
              </button>
            )}
          </section>

          {/* SETTINGS */}
          <aside className="w-full lg:w-95 xl:w-102.5 shrink-0 border-t lg:border-t-0 lg:border-l border-ig-border overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-6">
              {/* MEDIA UPLOAD */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ig-text">
                      Story media
                    </h3>
                    <p className="text-xs text-ig-muted mt-0.5">
                      {media.length}/10 selected
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      inputRef.current?.click()
                    }
                    disabled={
                      loading ||
                      media.length >= 10
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ig-border text-xs font-semibold text-ig-text hover:bg-ig-hover transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Add media
                  </button>
                </div>

                {media.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {media.map(
                      (item, index) => (
                        <button
                          type="button"
                          key={`${item.file.name}-${index}`}
                          onClick={() =>
                            setActiveIndex(
                              index
                            )
                          }
                          className={`relative aspect-9/14 rounded-lg overflow-hidden bg-black border-2 transition-all ${
                            activeIndex ===
                            index
                              ? "border-[#0095f6] ring-2 ring-[#0095f6]/20"
                              : "border-transparent"
                          }`}
                          aria-label={`Preview media ${index + 1}`}
                        >
                          {item.type ===
                          "image" ? (
                            <img
                              src={
                                item.preview
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={
                                item.preview
                              }
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          )}

                          <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/55 flex items-center justify-center">
                            {item.type ===
                            "image" ? (
                              <ImageIcon
                                size={10}
                                className="text-white"
                              />
                            ) : (
                              <Video
                                size={10}
                                className="text-white"
                              />
                            )}
                          </span>

                          {activeIndex ===
                            index && (
                            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#0095f6] flex items-center justify-center">
                              <Check
                                size={11}
                                className="text-white"
                              />
                            </span>
                          )}

                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();
                              removeMedia(
                                index
                              );
                            }}
                            onKeyDown={(
                              event
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                event.preventDefault();
                                event.stopPropagation();
                                removeMedia(
                                  index
                                );
                              }
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                            aria-label={`Remove media ${index + 1}`}
                          >
                            <X
                              size={11}
                              className="text-white"
                            />
                          </span>
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-ig-border p-5 text-center">
                    <ImageIcon
                      size={24}
                      className="mx-auto text-ig-muted"
                    />
                    <p className="text-xs text-ig-muted mt-2">
                      No media selected yet
                    </p>
                  </div>
                )}
              </div>

              {/* PRIVACY */}
              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-ig-text">
                    Story privacy
                  </h3>
                  <p className="text-xs text-ig-muted mt-0.5">
                    Choose who can see this story.
                  </p>
                </div>

                <div className="space-y-2">
                  {privacyOptions.map(
                    (option) => {
                      const Icon =
                        option.icon;
                      const selected =
                        privacy ===
                        option.value;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            setPrivacy(
                              option.value
                            )
                          }
                          disabled={
                            loading
                          }
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            selected
                              ? "border-[#0095f6] bg-[#0095f6]/8"
                              : "border-ig-border hover:bg-ig-hover"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              selected
                                ? "bg-[#0095f6] text-white"
                                : "bg-ig-hover text-ig-text"
                            }`}
                          >
                            <Icon
                              size={17}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ig-text">
                              {
                                option.label
                              }
                            </p>
                            <p className="text-xs text-ig-muted mt-0.5">
                              {
                                option.description
                              }
                            </p>
                          </div>

                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-[#0095f6] flex items-center justify-center">
                              <Check
                                size={12}
                                className="text-white"
                              />
                            </div>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* STORY INFO */}
              <div className="rounded-xl bg-ig-hover/60 border border-ig-border p-4">
                <div className="flex items-start gap-3">
                  <Shield
                    size={17}
                    className="text-ig-blue mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ig-text">
                      Story settings
                    </p>
                    <p className="text-xs text-ig-muted mt-1 leading-relaxed">
                      Stories are automatically available for 24 hours. You can add multiple photos or videos and choose your audience before sharing.
                    </p>
                  </div>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-xs leading-relaxed text-red-500">
                    {error}
                  </p>
                </div>
              )}

              {/* SHARE */}
              <button
                type="button"
                onClick={
                  handleCreateStory
                }
                disabled={
                  loading ||
                  media.length === 0
                }
                className="w-full h-11 rounded-xl bg-[#0095f6] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#1877f2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Sharing story...
                  </>
                ) : (
                  <>
                    <Sparkles
                      size={16}
                    />
                    Share Story
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-ig-muted">
                Your story will expire automatically after 24 hours.
              </p>
            </div>
          </aside>
        </div>

        {/* HIDDEN FILE INPUT */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(
              event.target.files
            );
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

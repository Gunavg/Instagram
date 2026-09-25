"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Check,
  Eye,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useI18n } from "@/lib/i18n";
import HighlightViewer from "./HighlightViewer";

interface StoryMedia {
  _id?: string;
  url: string;
  type: "image" | "video";
}

interface ArchivedStory {
  _id: string;
  media: StoryMedia[];
  createdAt: string;
  expiresAt: string;
  status?: "active" | "archived" | "deleted";
  viewsCount?: number;
  uniqueViewersCount?: number;
}

interface Highlight {
  _id: string;
  title: string;
  coverUrl?: string;
  stories: ArchivedStory[];
  totalViews?: number;
  uniqueViewers?: number;
}

const getArray = <T,>(
  data: any,
  keys: string[]
): T[] => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return Array.isArray(data) ? data : [];
};

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, Number(value) || 0));

export default function StoryHighlights() {
  const { t } = useI18n();

  const [highlights, setHighlights] =
    useState<Highlight[]>([]);
  const [archivedStories, setArchivedStories] =
    useState<ArchivedStory[]>([]);
  const [selectedStories, setSelectedStories] =
    useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] =
    useState(false);
  const [viewing, setViewing] =
    useState<Highlight | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        highlightsResponse,
        storiesResponse,
      ] = await Promise.all([
        axiosInstance.get(
          "/api/story-highlights"
        ),
        axiosInstance.get(
          "/api/stories/archive"
        ),
      ]);

      const loadedHighlights =
        getArray<Highlight>(
          highlightsResponse.data,
          ["highlights", "data"]
        );

      const stories = getArray<ArchivedStory>(
        storiesResponse.data,
        ["stories", "data"]
      ).filter(
        (story) => story.status !== "deleted"
      );

      const withAnalytics =
        await Promise.all(
          loadedHighlights.map(
            async (highlight) => {
              try {
                const response =
                  await axiosInstance.get(
                    `/api/story-highlights/${highlight._id}/analytics`
                  );
                const analytics =
                  response.data?.analytics;

                return {
                  ...highlight,
                  totalViews:
                    Number(
                      analytics?.totalViews || 0
                    ),
                  uniqueViewers:
                    Number(
                      analytics?.uniqueViewers || 0
                    ),
                };
              } catch {
                return highlight;
              }
            }
          )
        );

      setHighlights(withAnalytics);
      setArchivedStories(stories);
    } catch (requestError: any) {
      console.error(
        "Story highlights loading error:",
        requestError
      );
      setError(
        requestError?.response?.data?.message ||
          t("unableLoadHighlights")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStory = (id: string) => {
    setSelectedStories((previous) =>
      previous.includes(id)
        ? previous.filter(
            (storyId) => storyId !== id
          )
        : [...previous, id]
    );
  };

  const createHighlight = async () => {
    if (!title.trim()) {
      setError(t("enterHighlightName"));
      return;
    }

    if (!selectedStories.length) {
      setError(t("selectAtLeastOneStory"));
      return;
    }

    try {
      setSaving(true);
      setError("");

      await axiosInstance.post(
        "/api/story-highlights",
        {
          title: title.trim(),
          storyIds: selectedStories,
        }
      );

      setTitle("");
      setSelectedStories([]);
      setShowCreate(false);
      await loadData();
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          t("unableCreateHighlight")
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteHighlight = async (
    highlightId: string
  ) => {
    if (
      !window.confirm(
        "Delete this highlight?"
      )
    ) {
      return;
    }

    try {
      setDeleting(highlightId);

      await axiosInstance.delete(
        `/api/story-highlights/${highlightId}`
      );

      setHighlights((previous) =>
        previous.filter(
          (highlight) =>
            highlight._id !== highlightId
        )
      );
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          t("unableDeleteHighlight")
      );
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <section className="w-full py-3">
        <div className="flex justify-center py-4 text-ig-muted">
          <RefreshCw
            size={18}
            className="animate-spin"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-2"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Instagram-style highlight circles */}
      <div className="flex items-start gap-5 sm:gap-7 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {highlights.map((highlight) => {
          const firstStory =
            highlight.stories?.[0];
          const cover =
            highlight.coverUrl ||
            firstStory?.media?.[0]?.url;

          return (
            <div
              key={highlight._id}
              className="relative w-18 shrink-0 flex flex-col items-center gap-2 group"
            >
              <button
                type="button"
                onClick={() => setViewing(highlight)}
                className="w-18 h-18 rounded-full p-0.75 bg-linear-to-tr from-[#feda75] via-[#ee2a7b] to-[#6228d7] shadow-sm"
                aria-label={`Open ${highlight.title} highlight`}
              >
                <span className="block w-full h-full overflow-hidden rounded-full border-2 border-ig-surface bg-ig-hover">
                  {cover ? (
                    firstStory?.media?.[0]
                      ?.type === "video" ? (
                      <video
                        src={cover}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={cover}
                        alt={highlight.title}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-ig-muted">
                      {highlight.title.slice(
                        0,
                        1
                      )}
                    </span>
                  )}
                </span>
              </button>

              <span className="max-w-18 truncate text-xs text-ig-text">
                {highlight.title}
              </span>

              <button
                type="button"
                onClick={() =>
                  deleteHighlight(
                    highlight._id
                  )
                }
                disabled={
                  deleting === highlight._id
                }
                className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center rounded-full bg-black text-white group-hover:flex"
                aria-label="Delete highlight"
              >
                {deleting ===
                highlight._id ? (
                  <RefreshCw
                    size={10}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={10} />
                )}
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-18 shrink-0 flex flex-col items-center gap-2 group"
          aria-label="Create new highlight"
        >
          <span className="w-18 h-18 rounded-full border-2 border-ig-border bg-ig-surface flex items-center justify-center group-hover:bg-ig-hover transition-colors">
            <Plus
              size={28}
              strokeWidth={1.5}
              className="text-ig-text"
            />
          </span>
          <span className="max-w-18 truncate text-xs text-ig-text">
            New
          </span>
        </button>
      </div>

      {/* Create highlight dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-150 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-ig-border bg-white dark:bg-[#121212] shadow-2xl">
            <div className="flex items-center justify-between border-b border-ig-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-ig-text">
                  Create New Highlight
                </h3>
                <p className="mt-1 text-xs text-ig-muted">
                  Choose archived stories to keep on your profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                className="rounded-full p-2 hover:bg-ig-hover"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5">
              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                maxLength={50}
                placeholder={t("highlightName")}
                className="mb-4 w-full rounded-xl border border-ig-border bg-ig-bg px-4 py-3 text-sm text-ig-text outline-none focus:border-ig-blue"
              />

              {archivedStories.length ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {archivedStories.map(
                    (story) => {
                      const media =
                        story.media?.[0];
                      const selected =
                        selectedStories.includes(
                          story._id
                        );

                      return (
                        <button
                          key={story._id}
                          type="button"
                          onClick={() =>
                            toggleStory(
                              story._id
                            )
                          }
                          className={`relative aspect-9/14 overflow-hidden rounded-lg border-2 ${
                            selected
                              ? "border-[#0095f6]"
                              : "border-transparent"
                          }`}
                        >
                          {media?.type ===
                          "video" ? (
                            <video
                              src={media.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={media?.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}

                          {selected && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0095f6]">
                                <Check
                                  size={15}
                                  className="text-white"
                                />
                              </span>
                            </span>
                          )}

                          <span className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded bg-black/60 px-1 py-1 text-[9px] text-white">
                            <Eye size={9} />
                            {formatCount(
                              story.viewsCount ||
                                0
                            )}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-ig-border p-8 text-center">
                  <p className="text-sm text-ig-text">
                    No archived Stories available.
                  </p>
                  <p className="mt-1 text-xs text-ig-muted">
                    Stories will appear here after they expire.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-ig-border p-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-ig-border py-2.5 text-sm font-semibold text-ig-text hover:bg-ig-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createHighlight}
                disabled={
                  saving ||
                  !title.trim() ||
                  !selectedStories.length
                }
                className="flex-1 rounded-xl bg-[#0095f6] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Creating..."
                  : "Create Highlight"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <HighlightViewer
          title={viewing.title}
          stories={viewing.stories}
          totalViews={viewing.totalViews || 0}
          uniqueViewers={
            viewing.uniqueViewers || 0
          }
          onClose={() => setViewing(null)}
        />
      )}
    </section>
  );
}

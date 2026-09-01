"use client";

import { Plus, Trash2, X, Check, Play } from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
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
}

interface Highlight {
  _id: string;
  title: string;
  coverUrl?: string;
  stories: ArchivedStory[];
}

export default function StoryHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [archivedStories, setArchivedStories] = useState<ArchivedStory[]>([]);
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [highlightsResponse, storiesResponse] = await Promise.all([
        axiosInstance.get("/api/story-highlights"),
        axiosInstance.get("/api/stories/archive"),
      ]);

      setHighlights(highlightsResponse.data?.highlights || []);
      setArchivedStories(
        (storiesResponse.data?.stories || []).filter(
          (story: ArchivedStory) => story.status !== "deleted"
        )
      );
    } catch (err: any) {
      console.error("Story highlights loading error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to load story highlights"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStory = (storyId: string) => {
    setSelectedStories((previous) =>
      previous.includes(storyId)
        ? previous.filter((id) => id !== storyId)
        : [...previous, storyId]
    );
  };

  const handleCreateHighlight = async () => {
    setError("");

    if (!title.trim()) {
      setError("Please enter a highlight name.");
      return;
    }

    if (selectedStories.length === 0) {
      setError("Please select at least one story.");
      return;
    }

    try {
      setCreating(true);

      await axiosInstance.post("/api/story-highlights", {
        title: title.trim(),
        storyIds: selectedStories,
      });

      setTitle("");
      setSelectedStories([]);
      await loadData();
    } catch (err: any) {
      console.error("Create highlight error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to create highlight"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (
      !window.confirm(
        "Delete this highlight? Your Stories and analytics will not be deleted."
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
        previous.filter((highlight) => highlight._id !== highlightId)
      );
    } catch (err: any) {
      console.error("Delete highlight error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to delete highlight"
      );
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <section className="py-5">
        <h2 className="text-lg font-semibold text-ig-text mb-4">
          Story Highlights
        </h2>
        <p className="text-sm text-ig-muted">Loading highlights...</p>
      </section>
    );
  }

  return (
    <section className="w-full py-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-ig-text">
            Story Highlights
          </h2>
          <p className="text-xs text-ig-muted mt-1">
            Keep your favorite Stories on your profile.
          </p>
        </div>
      </div>

      {highlights.length > 0 ? (
        <div className="flex gap-6 overflow-x-auto pb-5 scrollbar-hide">
          {highlights.map((highlight) => {
            const firstStory = highlight.stories?.[0];
            const firstMedia = firstStory?.media?.[0];
            const cover = highlight.coverUrl || firstMedia?.url;

            return (
              <div
                key={highlight._id}
                className="relative shrink-0 w-20 flex flex-col items-center group"
              >
                <button
                  type="button"
                  onClick={() => setViewingHighlight(highlight)}
                  className="w-18 h-18 rounded-full p-0.75 bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                  aria-label={`Open ${highlight.title} highlight`}
                >
                  <div className="w-full h-full rounded-full border-2 border-ig-surface overflow-hidden bg-ig-hover">
                    {cover ? (
                      firstMedia?.type === "video" ? (
                        <div className="relative w-full h-full">
                          <video
                            src={cover}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play size={18} className="text-white" fill="white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={cover}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xl text-ig-muted">+</span>
                      </div>
                    )}
                  </div>
                </button>

                <span className="mt-2 text-xs text-ig-text truncate max-w-20 text-center">
                  {highlight.title}
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteHighlight(highlight._id)}
                  disabled={deleting === highlight._id}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  aria-label="Delete highlight"
                >
                  {deleting === highlight._id ? (
                    <span className="text-[9px]">...</span>
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-ig-border rounded-xl p-6 text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-full border border-ig-border flex items-center justify-center">
            <Plus size={22} className="text-ig-muted" />
          </div>
          <p className="text-sm font-semibold text-ig-text mt-3">
            No story highlights yet
          </p>
          <p className="text-xs text-ig-muted mt-1">
            Add your expired Stories to keep them on your profile.
          </p>
        </div>
      )}

      <div className="border border-ig-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-ig-text mb-3">
          Create New Highlight
        </h3>

        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Highlight name"
          maxLength={50}
          className="w-full px-3 py-2.5 mb-4 rounded-lg border border-ig-border bg-ig-surface text-ig-text text-sm outline-none focus:border-ig-blue"
        />

        {archivedStories.length > 0 ? (
          <>
            <p className="text-sm text-ig-muted mb-3">
              Select archived Stories:
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {archivedStories.map((story) => {
                const media = story.media?.[0];
                const isSelected = selectedStories.includes(story._id);

                return (
                  <button
                    key={story._id}
                    type="button"
                    onClick={() => toggleStory(story._id)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                      isSelected
                        ? "border-[#0095f6]"
                        : "border-transparent"
                    }`}
                  >
                    {media?.type === "video" ? (
                      <video
                        src={media.url}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={media?.url}
                        alt="Archived story"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {isSelected && (
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-[#0095f6] flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-ig-muted mt-3">
              {selectedStories.length} {selectedStories.length === 1 ? "story" : "stories"} selected
            </p>
          </>
        ) : (
          <div className="py-7 text-center border border-dashed border-ig-border rounded-lg">
            <p className="text-sm text-ig-text">No archived Stories available.</p>
            <p className="text-xs text-ig-muted mt-1">
              Stories will appear here after they expire.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <p className="flex-1 text-sm text-red-500">{error}</p>
            <button type="button" onClick={() => setError("")} className="text-red-500">
              <X size={16} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleCreateHighlight}
          disabled={creating || selectedStories.length === 0 || !title.trim()}
          className="w-full mt-4 py-2.5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "Create Highlight"}
        </button>
      </div>

      {viewingHighlight && (
        <HighlightViewer
          title={viewingHighlight.title}
          stories={viewingHighlight.stories}
          onClose={() => setViewingHighlight(null)}
        />
      )}
    </section>
  );
}
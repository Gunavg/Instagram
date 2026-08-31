"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";

interface StoryMedia {
  url: string;
  type: "image" | "video";
}

interface ArchivedStory {
  _id: string;
  media: StoryMedia[];
  createdAt: string;
  expiresAt: string;
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
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [highlightResponse, archiveResponse] = await Promise.all([
        axiosInstance.get("/api/story-highlights"),
        axiosInstance.get("/api/stories/archive"),
      ]);

      setHighlights(highlightResponse.data?.highlights || []);
      setArchivedStories(archiveResponse.data?.stories || []);
    } catch (err: any) {
      console.error("Story highlights error:", err);
      setError(
        err?.response?.data?.message || "Failed to load story highlights"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStory = (id: string) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const createHighlight = async () => {
    if (!title.trim()) {
      setError("Enter a highlight title.");
      return;
    }

    if (selected.length === 0) {
      setError("Select at least one archived story.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await axiosInstance.post("/api/story-highlights", {
        title: title.trim(),
        storyIds: selected,
      });

      setTitle("");
      setSelected([]);
      await load();
    } catch (err: any) {
      console.error("Create highlight error:", err);
      setError(
        err?.response?.data?.message || "Failed to create highlight"
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="py-6 text-sm text-ig-secondary">Loading highlights...</div>;
  }

  return (
    <section className="py-5">
      <h2 className="text-lg font-semibold text-ig-text mb-4">Story Highlights</h2>

      {highlights.length > 0 && (
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
          {highlights.map((highlight) => {
            const firstStory = highlight.stories?.[0];
            const firstMedia = firstStory?.media?.[0];

            return (
              <div key={highlight._id} className="shrink-0 w-20 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-ig-border p-1 overflow-hidden bg-ig-surface">
                  {highlight.coverUrl || firstMedia?.url ? (
                    <img
                      src={highlight.coverUrl || firstMedia?.url}
                      alt={highlight.title}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-ig-hover" />
                  )}
                </div>
                <p className="mt-1 text-xs text-ig-text truncate">{highlight.title}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="border border-ig-border rounded-xl p-4">
        <p className="text-sm font-semibold text-ig-text mb-3">
          Add archived stories to a new highlight
        </p>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={50}
          placeholder="Highlight name"
          className="w-full mb-3 px-3 py-2 rounded-lg border border-ig-border bg-ig-surface text-ig-text outline-none"
        />

        {archivedStories.length === 0 ? (
          <p className="text-sm text-ig-secondary">
            No archived stories yet. Stories become available here after 24 hours.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {archivedStories.map((story) => {
              const media = story.media?.[0];
              const isSelected = selected.includes(story._id);

              return (
                <button
                  key={story._id}
                  type="button"
                  onClick={() => toggleStory(story._id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    isSelected ? "border-blue-500" : "border-transparent"
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
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={createHighlight}
          disabled={creating || selected.length === 0}
          className="mt-4 w-full py-2.5 rounded-lg bg-[#0095f6] text-white font-semibold disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Highlight"}
        </button>
      </div>
    </section>
  );
}
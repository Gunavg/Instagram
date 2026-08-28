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
  status?: "active" | "archived" | "deleted";
}

interface Highlight {
  _id: string;
  title: string;
  coverUrl?: string;
  stories: ArchivedStory[];
}

const StoryHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [archivedStories, setArchivedStories] = useState<ArchivedStory[]>([]);

  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [title, setTitle] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load highlights and archived stories
  // --------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [highlightsResponse, storiesResponse] =
        await Promise.all([
          axiosInstance.get("/api/story-highlights"),
          axiosInstance.get("/api/stories/archive"),
        ]);

      setHighlights(
        highlightsResponse.data?.highlights || []
      );

      setArchivedStories(
        storiesResponse.data?.stories || []
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

  // --------------------------------------------------
  // Select / unselect archived story
  // --------------------------------------------------
  const toggleStory = (storyId: string) => {
    setSelectedStories((previous) => {
      if (previous.includes(storyId)) {
        return previous.filter((id) => id !== storyId);
      }

      return [...previous, storyId];
    });
  };

  // --------------------------------------------------
  // Create highlight
  // --------------------------------------------------
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

      await axiosInstance.post(
        "/api/story-highlights",
        {
          title: title.trim(),
          storyIds: selectedStories,
        }
      );

      // Clear form
      setTitle("");
      setSelectedStories([]);

      // Reload highlights
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

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------
  if (loading) {
    return (
      <section className="py-5">
        <h2 className="text-lg font-semibold text-ig-text mb-4">
          Story Highlights
        </h2>

        <p className="text-sm text-ig-muted">
          Loading highlights...
        </p>
      </section>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <section className="py-5">

      {/* --------------------------------------------- */}
      {/* Heading */}
      {/* --------------------------------------------- */}

      <h2 className="text-lg font-semibold text-ig-text mb-4">
        Story Highlights
      </h2>

      {/* --------------------------------------------- */}
      {/* Existing Highlights */}
      {/* --------------------------------------------- */}

      {highlights.length > 0 ? (
        <div className="flex gap-5 overflow-x-auto pb-5 scrollbar-hide">

          {highlights.map((highlight) => {
            const firstStory =
              highlight.stories?.[0];

            const firstMedia =
              firstStory?.media?.[0];

            const cover =
              highlight.coverUrl ||
              firstMedia?.url;

            return (
              <div
                key={highlight._id}
                className="flex flex-col items-center shrink-0 w-18"
              >

                {/* Highlight circle */}

                <div className="w-17 h-17 rounded-full border-2 border-ig-border p-0.75">

                  <div className="w-full h-full rounded-full overflow-hidden bg-ig-hover">

                    {cover ? (
                      firstMedia?.type === "video" &&
                      !highlight.coverUrl ? (
                        <video
                          src={cover}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={cover}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl text-ig-muted">
                          +
                        </span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Highlight name */}

                <span className="mt-2 text-xs text-ig-text truncate max-w-18">
                  {highlight.title}
                </span>

              </div>
            );
          })}

        </div>
      ) : (
        <p className="text-sm text-ig-muted mb-5">
          You don't have any story highlights yet.
        </p>
      )}

      {/* --------------------------------------------- */}
      {/* Create Highlight */}
      {/* --------------------------------------------- */}

      <div className="border border-ig-border rounded-xl p-4">

        <h3 className="text-sm font-semibold text-ig-text mb-3">
          Create New Highlight
        </h3>

        {/* Highlight title */}

        <input
          type="text"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="Highlight name"
          maxLength={50}
          className="w-full px-3 py-2 mb-4 rounded-lg border border-ig-border bg-ig-surface text-ig-text text-sm outline-none focus:border-ig-blue"
        />

        {/* ------------------------------------------- */}
        {/* Archived Stories */}
        {/* ------------------------------------------- */}

        {archivedStories.length > 0 ? (
          <>
            <p className="text-sm text-ig-muted mb-3">
              Select stories to add:
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">

              {archivedStories.map((story) => {
                const media =
                  story.media?.[0];

                const isSelected =
                  selectedStories.includes(
                    story._id
                  );

                return (
                  <button
                    key={story._id}
                    type="button"
                    onClick={() =>
                      toggleStory(story._id)
                    }
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                      isSelected
                        ? "border-[#0095f6]"
                        : "border-transparent"
                    }`}
                  >

                    {/* Story media */}

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

                    {/* Selected overlay */}

                    {isSelected && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">

                        <div className="w-7 h-7 rounded-full bg-[#0095f6] flex items-center justify-center text-white font-bold">
                          ✓
                        </div>

                      </div>
                    )}

                  </button>
                );
              })}

            </div>

            {/* Selected count */}

            <p className="text-xs text-ig-muted mt-3">
              {selectedStories.length} story
              {selectedStories.length === 1
                ? ""
                : "ies"}{" "}
              selected
            </p>
          </>
        ) : (
          <div className="py-6 text-center">

            <p className="text-sm text-ig-text">
              No archived stories available.
            </p>

            <p className="text-xs text-ig-muted mt-1">
              Your stories will appear here after
              they expire.
            </p>

          </div>
        )}

        {/* ------------------------------------------- */}
        {/* Error */}
        {/* ------------------------------------------- */}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">
              {error}
            </p>
          </div>
        )}

        {/* ------------------------------------------- */}
        {/* Create button */}
        {/* ------------------------------------------- */}

        <button
          type="button"
          onClick={handleCreateHighlight}
          disabled={
            creating ||
            selectedStories.length === 0 ||
            !title.trim()
          }
          className="w-full mt-4 py-2.5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating
            ? "Creating..."
            : "Create Highlight"}
        </button>

      </div>
    </section>
  );
};

export default StoryHighlights;
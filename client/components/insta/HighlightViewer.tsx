"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Play } from "lucide-react";

type StoryMedia = {
  _id?: string;
  url: string;
  type: "image" | "video";
};

type HighlightStory = {
  _id: string;
  media: StoryMedia[];
  createdAt: string;
  expiresAt: string;
};

interface Props {
  title: string;
  stories: HighlightStory[];
  onClose: () => void;
}

const MEDIA_DURATION = 5000;

export default function HighlightViewer({ title, stories, onClose }: Props) {
  const [storyIndex, setStoryIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);

  const story = stories[storyIndex];
  const media = story?.media || [];
  const currentMedia = media[mediaIndex];

  const progressKey = useMemo(
    () => `${story?._id || ""}-${mediaIndex}`,
    [story?._id, mediaIndex]
  );

  const goNext = () => {
    if (mediaIndex < media.length - 1) {
      setMediaIndex((index) => index + 1);
      return;
    }

    if (storyIndex < stories.length - 1) {
      setStoryIndex((index) => index + 1);
      setMediaIndex(0);
      return;
    }

    onClose();
  };

  const goPrevious = () => {
    if (mediaIndex > 0) {
      setMediaIndex((index) => index - 1);
      return;
    }

    if (storyIndex > 0) {
      const previousStoryIndex = storyIndex - 1;
      const previousStory = stories[previousStoryIndex];

      setStoryIndex(previousStoryIndex);
      setMediaIndex(Math.max(0, (previousStory?.media?.length || 1) - 1));
    }
  };

  useEffect(() => {
    if (!currentMedia || currentMedia.type === "video") return;

    const timer = window.setTimeout(goNext, MEDIA_DURATION);
    return () => window.clearTimeout(timer);
  }, [progressKey, currentMedia?.type]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
    };

    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [storyIndex, mediaIndex, stories.length]);

  if (!story || !currentMedia) return null;

  return (
    <div className="fixed inset-0 z-300 bg-black flex items-center justify-center">
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="flex gap-1 mb-3">
          {media.map((_, index) => (
            <div key={index} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className={`h-full bg-white ${index < mediaIndex ? "w-full" : index === mediaIndex ? "w-full" : "w-0"}`}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-white">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-white/70">Story {storyIndex + 1} of {stories.length}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close highlight">
            <X size={28} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={goPrevious}
        className="absolute left-3 md:left-8 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center"
        aria-label="Previous highlight story"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="relative w-full max-w-md h-[90vh] flex items-center justify-center bg-black">
        {currentMedia.type === "video" ? (
          <video
            key={currentMedia.url}
            src={currentMedia.url}
            autoPlay
            playsInline
            className="max-h-full max-w-full object-contain"
            onEnded={goNext}
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={`${title} story`}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {currentMedia.type === "video" && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-white text-xs flex items-center gap-1">
            <Play size={12} fill="white" /> Highlight video
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={goNext}
        className="absolute right-3 md:right-8 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center"
        aria-label="Next highlight story"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
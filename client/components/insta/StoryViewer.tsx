"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  X,
  BarChart3,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axiosInstance from "@/lib/axios";
import { currentUser } from "@/lib/mock-data";
import StoryAnalytics from "./StoryAnalytics";

const STORY_DURATION = 5000;

type StoryMedia = {
  _id?: string;
  url: string;
  type: "image" | "video";
  duration?: number;
};

type StoryViewerUser = {
  _id: string;
  username: string;
  fullName?: string;
  profilePic?: string;
  profilePicture?: string;
};

type ViewerStory = {
  _id: string;
  media: StoryMedia[];
  createdAt: string;
  expiresAt: string;
};

type StoryViewerGroup = {
  user: StoryViewerUser;
  stories: ViewerStory[];
};

type StoryViewerProps = {
  group: StoryViewerGroup[];
  initialGroupIndex: number;
  onClose: () => void;
};

export default function StoryViewer({
  group,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentGroup = group[groupIndex];
  const currentStory = currentGroup?.stories?.[storyIndex];
  const media = currentStory?.media || [];
  const currentMedia = media[mediaIndex];

  const isOwner =
    currentGroup?.user?._id?.toString() === currentUser._id?.toString();

  const resetMedia = () => {
    setMediaIndex(0);
    setLiked(false);
  };

  const recordView = useCallback(
    async (completed = false) => {
      if (!currentStory?._id) return;

      try {
        await axiosInstance.post(
          `/api/stories/${currentStory._id}/view`,
          {
            mediaIndex,
            completed,
          }
        );
      } catch (error) {
        console.error("Failed to record story view:", error);
      }
    },
    [currentStory?._id, mediaIndex]
  );

  const goNext = useCallback(() => {
    if (!currentGroup || !currentStory) {
      onClose();
      return;
    }

    // Move through every media item in the current story first.
    if (mediaIndex < media.length - 1) {
      const completed = false;
      recordView(completed);
      setMediaIndex((index) => index + 1);
      return;
    }

    // Last media of this story has been completed.
    recordView(true);

    // Then move to the next story belonging to the same user.
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((index) => index + 1);
      resetMedia();
      return;
    }

    // Finally move to the next user's story group.
    if (groupIndex < group.length - 1) {
      setGroupIndex((index) => index + 1);
      setStoryIndex(0);
      resetMedia();
      return;
    }

    onClose();
  }, [
    currentGroup,
    currentStory,
    mediaIndex,
    media.length,
    storyIndex,
    groupIndex,
    group.length,
    recordView,
    onClose,
  ]);

  const goPrev = useCallback(() => {
    if (mediaIndex > 0) {
      setMediaIndex((index) => index - 1);
      return;
    }

    if (storyIndex > 0) {
      const previousStory = currentGroup?.stories?.[storyIndex - 1];
      setStoryIndex((index) => index - 1);
      setMediaIndex(Math.max(0, (previousStory?.media?.length || 1) - 1));
      setLiked(false);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup = group[groupIndex - 1];
      const previousStoryIndex = Math.max(0, previousGroup.stories.length - 1);
      const previousStory = previousGroup.stories[previousStoryIndex];

      setGroupIndex((index) => index - 1);
      setStoryIndex(previousStoryIndex);
      setMediaIndex(Math.max(0, (previousStory?.media?.length || 1) - 1));
      setLiked(false);
    }
  }, [mediaIndex, storyIndex, groupIndex, currentGroup, group]);

  // Record a view whenever a new story/media item is displayed.
  useEffect(() => {
    if (!currentStory?._id || !currentMedia) return;
    recordView(false);
  }, [currentStory?._id, mediaIndex, currentMedia, recordView]);

  // Auto advance. Videos are also limited to the normal story duration;
  // the video itself can still finish earlier and advance naturally.
  useEffect(() => {
    if (paused || !currentMedia) return;

    timerRef.current = setTimeout(goNext, STORY_DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused, currentMedia, goNext]);

  // Skip an expired story immediately.
  useEffect(() => {
    if (!currentStory?.expiresAt) return;

    const remaining =
      new Date(currentStory.expiresAt).getTime() - Date.now();

    if (remaining <= 0) {
      goNext();
      return;
    }

    const timer = setTimeout(goNext, remaining);
    return () => clearTimeout(timer);
  }, [currentStory?.expiresAt, goNext]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  const react = async () => {
    if (!currentStory?._id) return;

    try {
      if (liked) {
        await axiosInstance.delete(
          `/api/stories/${currentStory._id}/reaction`
        );
        setLiked(false);
      } else {
        await axiosInstance.post(
          `/api/stories/${currentStory._id}/reaction`,
          { reaction: "like" }
        );
        setLiked(true);
      }
    } catch (error) {
      console.error("Story reaction error:", error);
    }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !currentStory?._id || sendingReply) return;

    try {
      setSendingReply(true);

      await axiosInstance.post(
        `/api/stories/${currentStory._id}/reply`,
        { text }
      );

      setReply("");
    } catch (error) {
      console.error("Story reply error:", error);
    } finally {
      setSendingReply(false);
    }
  };

  const deleteStory = async () => {
    if (!currentStory?._id || !isOwner) return;

    const confirmed = window.confirm(
      "Delete this story before it expires?"
    );

    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/api/stories/${currentStory._id}`);
      onClose();
    } catch (error) {
      console.error("Delete story error:", error);
    }
  };

  const getStoryAge = useMemo(() => {
    if (!currentStory?.createdAt) return "now";

    const minutes = Math.floor(
      (Date.now() - new Date(currentStory.createdAt).getTime()) /
        (1000 * 60)
    );

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    return `${Math.min(24, Math.floor(minutes / 60))}h`;
  }, [currentStory?.createdAt]);

  if (!currentGroup || !currentStory || !currentMedia) return null;

  const profileImage =
    currentGroup.user.profilePicture ||
    currentGroup.user.profilePic ||
    "";

  return (
    <div className="fixed inset-0 z-200 bg-black flex items-center justify-center">
      <div className="relative w-full max-w-100 h-[100dvh] bg-black overflow-hidden">
        {currentMedia.type === "video" ? (
          <video
            ref={videoRef}
            key={`${currentStory._id}-${mediaIndex}`}
            src={currentMedia.url}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={() => goNext()}
          />
        ) : (
          <img
            key={`${currentStory._id}-${mediaIndex}`}
            src={currentMedia.url}
            alt="Story"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-transparent to-black/65 pointer-events-none" />

        {/* Progress for every media item in the current story. */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {media.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-white ${
                  index < mediaIndex ? "w-full" :
                  index > mediaIndex ? "w-0" : "w-full"
                }`}
                style={
                  index === mediaIndex
                    ? {
                        animation: `storyFill ${
                          currentMedia.type === "video"
                            ? STORY_DURATION
                            : STORY_DURATION
                        }ms linear forwards`,
                        animationPlayState: paused
                          ? "paused"
                          : "running",
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-500" />
              )}
            </div>

            <span className="text-white text-sm font-semibold">
              {currentGroup.user.username}
            </span>
            <span className="text-white/70 text-xs">· {getStoryAge}</span>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAnalytics(true)}
                  className="text-white p-2"
                  aria-label="Story analytics"
                >
                  <BarChart3 size={20} />
                </button>
                <button
                  type="button"
                  onClick={deleteStory}
                  className="text-white text-xs px-2 py-1 rounded bg-black/40"
                >
                  Delete
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-white p-2"
              aria-label="Close story"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Previous / next hit areas */}
        <button
          type="button"
          aria-label="Previous story"
          onClick={goPrev}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute left-0 top-20 bottom-20 w-1/3 z-10"
        />
        <button
          type="button"
          aria-label="Next story"
          onClick={goNext}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute right-0 top-20 bottom-20 w-1/3 z-10"
        />

        {/* Reply / reaction bar */}
        {!isOwner && (
          <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendReply();
              }}
              maxLength={500}
              placeholder="Reply to story..."
              className="min-w-0 flex-1 rounded-full border border-white/60 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/70 outline-none"
            />

            <button
              type="button"
              onClick={react}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-black/40"
              aria-label="Like story"
            >
              <Heart size={22} fill={liked ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={sendReply}
              disabled={!reply.trim() || sendingReply}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-black/40 disabled:opacity-40"
              aria-label="Send reply"
            >
              <Send size={20} />
            </button>
          </div>
        )}

        {/* Desktop navigation */}
        {groupIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="hidden md:flex absolute left-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 items-center justify-center z-30"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {groupIndex < group.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="hidden md:flex absolute right-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 items-center justify-center z-30"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {showAnalytics && isOwner && currentStory?._id && (
        <StoryAnalytics
          storyId={currentStory._id}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
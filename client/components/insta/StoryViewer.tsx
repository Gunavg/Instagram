"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MoreHorizontal,
  Send,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const STORY_DURATION = 5000;
const StoryViewer = ({ group, initialGroupIndex, onClose }: any) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);

  const currentGroup = group[groupIndex];
  const totalStories = currentGroup?.stories.length ?? 1;
  const goNext = useCallback(() => {
    if (storyIndex < totalStories - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < group.length - 1) {
      setGroupIndex((g: any) => g + 1);
      setStoryIndex(0);
      setLiked(false);
    } else {
      onClose();
    }
  }, [storyIndex, totalStories, groupIndex, group.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((g: any) => g - 1);
      setStoryIndex(0);
      setLiked(false);
    }
  }, [storyIndex, groupIndex]);

  const goToGroup = (idx: number) => {
    setGroupIndex(idx);
    setStoryIndex(0);
    setLiked(false);
  };

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(goNext, STORY_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [groupIndex, storyIndex, paused, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handlePointerDown = () => {
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setPaused(true);
    }, 180);
  };

  const handlePointerUp = (side: "left" | "right") => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setPaused(false);
    } else {
      if (side === "left") goPrev();
      else goNext();
    }
  };

  if (!currentGroup) return null;
  const currentStory = currentGroup.stories[storyIndex];
  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Sidebar thumbnails — desktop */}
      <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 w-full max-w-[800px] px-4 justify-between pointer-events-none">
        {groupIndex > 0 && (
          <button
            onClick={() => goToGroup(groupIndex - 1)}
            className="pointer-events-auto bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all shrink-0"
          >
            <ChevronLeft size={22} className="text-ig-text" />
          </button>
        )}
        {groupIndex < group.length - 1 && (
          <button
            onClick={() => goToGroup(groupIndex + 1)}
            className="pointer-events-auto bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all ml-auto shrink-0"
          >
            <ChevronRight size={22} className="text-ig-text" />
          </button>
        )}
      </div>

      <div
        className="relative w-full max-w-[400px] bg-black overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {/* Background image */}
        <img
          key={currentStory._id}
          src={currentStory.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none" />
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10 pointer-events-none">
          {currentGroup.stories.map((_: any, i: any) => (
            <div
              key={i}
              className="flex-1 h-[2px] bg-white/40 rounded-full overflow-hidden"
            >
              {i < storyIndex ? (
                <div className="h-full w-full bg-white" />
              ) : i === storyIndex ? (
                <div
                  key={`${groupIndex}-${storyIndex}`}
                  className="h-full bg-white rounded-full"
                  style={{
                    animation: `storyFill ${STORY_DURATION}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              ) : (
                <div className="h-full w-0 bg-white" />
              )}
            </div>
          ))}
        </div>
        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shrink-0">
              <img
                src={currentGroup.user.profilePic}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-sm font-semibold drop-shadow">
              {currentGroup.user.username}
            </span>
            <span className="text-white/60 text-xs">· 23h</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-white hover:opacity-70 transition-opacity">
              <MoreHorizontal size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:opacity-70 transition-opacity"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {/* Tap navigation areas */}
        <div className="absolute inset-0 flex" style={{ top: 60, bottom: 80 }}>
          <div
            className="w-1/3 h-full cursor-pointer select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp("left")}
          />
          <div
            className="flex-1 h-full cursor-pointer select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp("right")}
          />
        </div>

        {/* Pause indicator */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex gap-2">
              <div className="w-1.5 h-8 bg-white rounded-full" />
              <div className="w-1.5 h-8 bg-white rounded-full" />
            </div>
          </div>
        )}
        <div className="absolute bottom-5 left-3 right-3 flex items-center gap-3 z-10">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Reply to ${currentGroup.user.username}…`}
            className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2 text-white text-sm placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
            onFocus={() => setPaused(true)}
            onBlur={() => {
              if (!reply) setPaused(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiked((l) => !l);
            }}
            className="hover:scale-110 transition-transform active:scale-95"
          >
            <Heart
              size={26}
              strokeWidth={1.5}
              className={liked ? "fill-[#ed4956] text-[#ed4956]" : "text-white"}
            />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-white hover:opacity-70"
          >
            <Send size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
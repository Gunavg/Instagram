"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  currentUser,
  storyUsers,
  mockStoryGroups,
  User,
} from "@/lib/mock-data";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import StoryViewer from "./StoryViewer";

function StoryRing({
  user,
  isSelf = false,
  hasStory = true,
  viewed = false,
  onClick,
}: {
  user: User;
  isSelf?: boolean;
  hasStory?: boolean;
  viewed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex flex-col items-center gap-[6px] shrink-0 active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <div className="relative">
        <div
          className={`w-[66px] h-[66px] rounded-full p-[2px] transition-opacity ${
            hasStory && !viewed ? "story-gradient" : "bg-ig-border"
          }`}
        >
          <div className="w-full h-full rounded-full bg-ig-surface p-[2px]">
            <img
              src={user.profilePic}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
        {isSelf && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-ig-surface">
            <Plus size={10} strokeWidth={3} className="text-white" />
          </div>
        )}
      </div>
      <span className="text-xs text-ig-text truncate w-[66px] text-center">
        {isSelf ? "Your story" : user.username}
      </span>
    </button>
  );
}

export default function Stories() {
  const [openCreate, setOpenCreate] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewedIndices, setViewedIndices] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const handleStoryClick = (index: number) => {
    setViewerGroupIndex(index);
    setViewerOpen(true);
    setViewedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  return (
    <>
      <div className="bg-ig-surface border-b border-ig-border md:border md:rounded-sm md:mb-6 relative">
        {/* Scroll buttons — desktop hover */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            aria-label="Scroll stories left"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-ig-surface border border-ig-border items-center justify-center shadow-sm hover:bg-ig-hover transition-colors"
          >
            <ChevronLeft size={16} className="text-ig-text" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            aria-label="Scroll stories right"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-ig-surface border border-ig-border items-center justify-center shadow-sm hover:bg-ig-hover transition-colors"
          >
            <ChevronRight size={16} className="text-ig-text" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <StoryRing
            user={currentUser}
            isSelf
            hasStory={false}
            onClick={() => setOpenCreate(true)}
          />
          {storyUsers.map((user, i) => (
            <StoryRing
              key={user._id}
              user={user}
              viewed={viewedIndices.has(i)}
              onClick={() => handleStoryClick(i)}
            />
          ))}
        </div>
      </div>
      {viewerOpen && (
        <StoryViewer
          group={mockStoryGroups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { currentUser } from "@/lib/mock-data";
import axiosInstance from "@/lib/axios";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import StoryViewer from "./StoryViewer";
import CreateStory from "./CreateStory";

/* =========================================================
   TYPES
========================================================= */

type StoryMedia = {
  _id?: string;
  url: string;
  type: "image" | "video";
};

type StoryUser = {
  _id: string;
  username: string;
  fullName: string;
  profilePic: string;
};

type Story = {
  _id: string;
  user: {
    _id: string;
    username: string;
    fullName?: string;
    profilePic?: string;
    profilePicture?: string;
  };
  media: StoryMedia[];
  createdAt: string;
  expiresAt: string;
};

type StoryGroup = {
  user: StoryUser;
  stories: Story[];
};

/* =========================================================
   STORY RING
========================================================= */

function StoryRing({
  user,
  isSelf = false,
  hasStory = true,
  viewed = false,
  onClick,
}: {
  user: StoryUser;
  isSelf?: boolean;
  hasStory?: boolean;
  viewed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 active:opacity-80 transition-opacity"
    >
      <div className="relative">
        <div
          className={`w-16.5 h-16.5 rounded-full p-0.5 transition-opacity ${
            hasStory && !viewed
              ? "story-gradient"
              : "bg-ig-border"
          }`}
        >
          <div className="w-full h-full rounded-full bg-ig-surface p-0.5">
            <img
              src={user.profilePic}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Plus icon only when the current user has no story */}
        {isSelf && !hasStory && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-ig-surface">
            <Plus
              size={10}
              strokeWidth={3}
              className="text-white"
            />
          </div>
        )}
      </div>

      <span className="text-xs text-ig-text truncate w-16.5 text-center">
        {isSelf ? "Your story" : user.username}
      </span>
    </button>
  );
}

/* =========================================================
   MAIN STORIES COMPONENT
========================================================= */

export default function Stories() {
  /* -------------------------------------------------------
     CREATE STORY
  ------------------------------------------------------- */

  const [openCreate, setOpenCreate] = useState(false);

  /* -------------------------------------------------------
     STORY VIEWER
  ------------------------------------------------------- */

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

  /* -------------------------------------------------------
     VIEWED STORIES
  ------------------------------------------------------- */

  const [viewedIndices, setViewedIndices] = useState<Set<number>>(
    new Set(),
  );

  /* -------------------------------------------------------
     BACKEND STORIES
  ------------------------------------------------------- */

  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);

  /* -------------------------------------------------------
     SCROLL
  ------------------------------------------------------- */

  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /* =========================================================
     FETCH STORIES
  ========================================================= */

  const fetchStories = useCallback(async () => {
    try {
      setLoadingStories(true);

      const response = await axiosInstance.get("/api/stories");

      const fetchedStories: Story[] =
        response.data?.stories || [];

      /*
       * Client-side expiration check.
       *
       * Backend should also remove expired stories.
       * This prevents an expired story from being displayed
       * if an old record is returned by the API.
       */
      const now = Date.now();

      const activeStories = fetchedStories.filter((story) => {
        if (!story.expiresAt) {
          return false;
        }

        const expiryTime = new Date(story.expiresAt).getTime();

        return expiryTime > now;
      });

      setStories(activeStories);

      /*
       * Remove viewed indexes whenever the story list changes.
       */
      setViewedIndices(new Set());
    } catch (error: any) {
      console.error("Failed to fetch stories:", error);

      setStories([]);
      setViewedIndices(new Set());
    } finally {
      setLoadingStories(false);
    }
  }, []);

  /* =========================================================
     FETCH STORIES WHEN COMPONENT LOADS
  ========================================================= */

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  /* =========================================================
     REMOVE EXPIRED STORIES AUTOMATICALLY
     
     This runs every minute so the UI does not keep showing
     a story after its 24-hour expiration time.
  ========================================================= */

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStories((previousStories) => {
        const now = Date.now();

        const activeStories = previousStories.filter((story) => {
          if (!story.expiresAt) {
            return false;
          }

          return (
            new Date(story.expiresAt).getTime() > now
          );
        });

        return activeStories;
      });
    }, 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /* =========================================================
     GROUP STORIES BY USER
  ========================================================= */

  const storyGroups: StoryGroup[] = [];

  stories.forEach((story) => {
    const userId = story.user?._id;

    if (!userId) {
      return;
    }

    const existingGroup = storyGroups.find(
      (group) => group.user._id === userId,
    );

    const profilePic =
      story.user.profilePicture ||
      story.user.profilePic ||
      "";

    const user: StoryUser = {
      _id: story.user._id,
      username: story.user.username,
      fullName:
        story.user.fullName ||
        story.user.username,
      profilePic,
    };

    if (existingGroup) {
      existingGroup.stories.push(story);
    } else {
      storyGroups.push({
        user,
        stories: [story],
      });
    }
  });

  /* =========================================================
     CURRENT USER STORY
  ========================================================= */

  const myStoryGroup = storyGroups.find(
    (group) => group.user._id === currentUser._id,
  );

  const hasMyStory = Boolean(myStoryGroup);

  /* =========================================================
     OTHER USERS' STORIES
  ========================================================= */

  const otherStoryGroups = storyGroups.filter(
    (group) => group.user._id !== currentUser._id,
  );

  /* =========================================================
     STORY GROUPS FOR STORY VIEWER
  ========================================================= */

  const viewerGroups = storyGroups.map((group) => ({
    user: group.user,

    stories: group.stories.map((story) => ({
      _id: story._id,
      media: story.media,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
    })),
  }));

  /* =========================================================
     SCROLL STATE
  ========================================================= */

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    setCanScrollLeft(element.scrollLeft > 4);

    setCanScrollRight(
      element.scrollLeft + element.clientWidth <
        element.scrollWidth - 4,
    );
  }, []);

  useEffect(() => {
    updateScrollState();

    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.addEventListener(
      "scroll",
      updateScrollState,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      updateScrollState,
    );

    return () => {
      element.removeEventListener(
        "scroll",
        updateScrollState,
      );

      window.removeEventListener(
        "resize",
        updateScrollState,
      );
    };
  }, [updateScrollState, stories]);

  /* =========================================================
     SCROLL LEFT / RIGHT
  ========================================================= */

  const scrollStories = (
    direction: "left" | "right",
  ) => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left:
        direction === "left"
          ? -300
          : 300,
      behavior: "smooth",
    });
  };

  /* =========================================================
     CURRENT USER STORY CLICK
  ========================================================= */

  const handleMyStoryClick = () => {
    /*
     * No active story:
     * Open Create Story.
     */
    if (!myStoryGroup) {
      setOpenCreate(true);
      return;
    }

    /*
     * Active story exists:
     * Open Story Viewer.
     */
    const index = storyGroups.findIndex(
      (group) =>
        group.user._id === currentUser._id,
    );

    if (index !== -1) {
      setViewerGroupIndex(index);
      setViewerOpen(true);
    }
  };

  /* =========================================================
     OTHER USER STORY CLICK
  ========================================================= */

  const handleOtherStoryClick = (
    index: number,
  ) => {
    if (
      index < 0 ||
      index >= viewerGroups.length
    ) {
      return;
    }

    setViewerGroupIndex(index);
    setViewerOpen(true);

    setViewedIndices((previous) => {
      const next = new Set(previous);

      next.add(index);

      return next;
    });
  };

  /* =========================================================
     STORY CREATED
  ========================================================= */

  const handleStoryCreated = async () => {
    /*
     * Close Create Story modal.
     */
    setOpenCreate(false);

    /*
     * Fetch latest stories.
     *
     * This makes the newly created story immediately
     * appear in "Your story".
     */
    await fetchStories();
  };

  /* =========================================================
     CLOSE VIEWER
  ========================================================= */

  const handleCloseViewer = () => {
    setViewerOpen(false);

    /*
     * Refresh after closing.
     *
     * This also catches stories that may have expired
     * while the viewer was open.
     */
    fetchStories();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <div className="bg-ig-surface border-b border-ig-border md:border md:rounded-sm md:mb-6 relative">
        {/* =================================================
            LEFT SCROLL BUTTON
        ================================================= */}

        {canScrollLeft && (
          <button
            type="button"
            onClick={() =>
              scrollStories("left")
            }
            aria-label="Scroll stories left"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-ig-surface border border-ig-border items-center justify-center shadow-sm hover:bg-ig-hover transition-colors"
          >
            <ChevronLeft
              size={16}
              className="text-ig-text"
            />
          </button>
        )}

        {/* =================================================
            RIGHT SCROLL BUTTON
        ================================================= */}

        {canScrollRight && (
          <button
            type="button"
            onClick={() =>
              scrollStories("right")
            }
            aria-label="Scroll stories right"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-ig-surface border border-ig-border items-center justify-center shadow-sm hover:bg-ig-hover transition-colors"
          >
            <ChevronRight
              size={16}
              className="text-ig-text"
            />
          </button>
        )}

        {/* =================================================
            STORY LIST
        ================================================= */}

        <div
          ref={scrollRef}
          className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {/* =================================================
              YOUR STORY
          ================================================= */}

          <StoryRing
            user={{
              _id: currentUser._id,
              username: currentUser.username,
              fullName:
                currentUser.fullName ||
                currentUser.username,
              profilePic:
                currentUser.profilePic || "",
            }}
            isSelf
            hasStory={hasMyStory}
            onClick={handleMyStoryClick}
          />

          {/* =================================================
              LOADING STATE
          ================================================= */}

          {loadingStories && (
            <>
              <div className="w-16.5 h-16.5 rounded-full bg-gray-200 animate-pulse shrink-0" />

              <div className="w-16.5 h-16.5 rounded-full bg-gray-200 animate-pulse shrink-0" />

              <div className="w-16.5 h-16.5 rounded-full bg-gray-200 animate-pulse shrink-0" />
            </>
          )}

          {/* =================================================
              REAL BACKEND STORIES
          ================================================= */}

          {!loadingStories &&
            otherStoryGroups.map((group) => {
              const globalIndex =
                storyGroups.findIndex(
                  (item) =>
                    item.user._id ===
                    group.user._id,
                );

              if (globalIndex === -1) {
                return null;
              }

              return (
                <StoryRing
                  key={group.user._id}
                  user={group.user}
                  hasStory
                  viewed={viewedIndices.has(
                    globalIndex,
                  )}
                  onClick={() =>
                    handleOtherStoryClick(
                      globalIndex,
                    )
                  }
                />
              );
            })}
        </div>
      </div>

      {/* =====================================================
          CREATE STORY
      ===================================================== */}

      {openCreate && (
        <CreateStory
          open={openCreate}
          onClose={() =>
            setOpenCreate(false)
          }
          onCreated={handleStoryCreated}
        />
      )}

      {/* =====================================================
          STORY VIEWER
      ===================================================== */}

      {viewerOpen &&
        viewerGroups.length > 0 && (
          <StoryViewer
            group={viewerGroups}
            initialGroupIndex={
              viewerGroupIndex
            }
            onClose={handleCloseViewer}
          />
        )}
    </>
  );
}
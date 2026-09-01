"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  X,
  BarChart3,
  Eye,
} from "lucide-react";
import type { ReactNode } from "react";

import axiosInstance from "@/lib/axios";
import { currentUser } from "@/lib/mock-data";

import StoryAnalytics from "./StoryAnalytics";

/*
 * ============================================================
 * STORY SETTINGS
 * ============================================================
 */

const STORY_DURATION = 5000;

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

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

  viewsCount?: number;

  uniqueViewersCount?: number;

  completedViewsCount?: number;
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

/*
 * ============================================================
 * AXIOS ERROR TYPE
 * ============================================================
 *
 * This fixes:
 *
 * Property 'response' does not exist on type '{}'
 *
 * We do not directly access error.response anymore.
 */
type ApiError = {
  response?: {
    status?: number;

    data?: {
      success?: boolean;

      message?: string;
    };
  };

  message?: string;
};

/*
 * ============================================================
 * STORY VIEWER
 * ============================================================
 */

export default function StoryViewer({
  group,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) {
  /*
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [groupIndex, setGroupIndex] =
    useState(initialGroupIndex);

  const [storyIndex, setStoryIndex] =
    useState(0);

  const [mediaIndex, setMediaIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const [liked, setLiked] =
    useState(false);

  const [reply, setReply] =
    useState("");

  const [sendingReply, setSendingReply] =
    useState(false);

  const [showAnalytics, setShowAnalytics] =
    useState(false);

  /*
   * ==========================================================
   * REFS
   * ==========================================================
   */

  const timerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  /*
   * ==========================================================
   * CURRENT STORY
   * ==========================================================
   */

  const currentGroup =
    group[groupIndex];

  const currentStory =
    currentGroup?.stories?.[
      storyIndex
    ];

  const media =
    currentStory?.media || [];

  const currentMedia =
    media[mediaIndex];

  /*
   * ==========================================================
   * STORY OWNER
   * ==========================================================
   */

  const isOwner =
    currentGroup?.user?._id
      ?.toString() ===
    currentUser._id?.toString();

  /*
   * ==========================================================
   * CLEAR TIMER
   * ==========================================================
   */

  const clearStoryTimer =
    useCallback(() => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );

        timerRef.current = null;
      }
    }, []);

  /*
   * ==========================================================
   * RESET MEDIA
   * ==========================================================
   */

  const resetMedia = useCallback(() => {
    setMediaIndex(0);

    setLiked(false);

    setPaused(false);
  }, []);

  /*
   * ==========================================================
   * RECORD STORY VIEW
   * ==========================================================
   *
   * A StoryView is created only once per user/story
   * on the backend.
   *
   * Additional requests update the existing record.
   */

  const recordView = useCallback(
    async (
      completed = false,
      targetMediaIndex?: number
    ) => {
      if (!currentStory?._id) {
        return;
      }

      try {
        await axiosInstance.post(
          `/api/stories/${currentStory._id}/view`,
          {
            mediaIndex:
              targetMediaIndex ??
              mediaIndex,

            completed,
          }
        );
      } catch (error: unknown) {
        const apiError =
          error as ApiError;

        console.error(
          "Failed to record story view:",
          apiError.response?.data ||
            apiError.message ||
            error
        );
      }
    },
    [
      currentStory?._id,
      mediaIndex,
    ]
  );

  /*
   * ==========================================================
   * GO TO NEXT
   * ==========================================================
   */

  const goNext =
    useCallback(() => {
      clearStoryTimer();

      if (
        !currentGroup ||
        !currentStory
      ) {
        onClose();

        return;
      }

      /*
       * ------------------------------------------------------
       * MORE MEDIA IN CURRENT STORY
       * ------------------------------------------------------
       */

      if (
        mediaIndex <
        media.length - 1
      ) {
        const nextMediaIndex =
          mediaIndex + 1;

        /*
         * Update progress for the
         * current media item.
         */
        recordView(
          false,
          nextMediaIndex
        );

        setMediaIndex(
          nextMediaIndex
        );

        return;
      }

      /*
       * ------------------------------------------------------
       * CURRENT STORY COMPLETED
       * ------------------------------------------------------
       */

      recordView(
        true,
        mediaIndex
      );

      /*
       * ------------------------------------------------------
       * MORE STORIES FROM SAME USER
       * ------------------------------------------------------
       */

      if (
        storyIndex <
        currentGroup.stories.length -
          1
      ) {
        setStoryIndex(
          (index) =>
            index + 1
        );

        resetMedia();

        return;
      }

      /*
       * ------------------------------------------------------
       * NEXT USER
       * ------------------------------------------------------
       */

      if (
        groupIndex <
        group.length - 1
      ) {
        setGroupIndex(
          (index) =>
            index + 1
        );

        setStoryIndex(0);

        resetMedia();

        return;
      }

      /*
       * ------------------------------------------------------
       * NO MORE STORIES
       * ------------------------------------------------------
       */

      onClose();
    }, [
      clearStoryTimer,
      currentGroup,
      currentStory,
      mediaIndex,
      media.length,
      storyIndex,
      groupIndex,
      group.length,
      recordView,
      resetMedia,
      onClose,
    ]);

  /*
   * ==========================================================
   * GO TO PREVIOUS
   * ==========================================================
   */

  const goPrev =
    useCallback(() => {
      clearStoryTimer();

      /*
       * Previous media in current Story.
       */
      if (mediaIndex > 0) {
        setMediaIndex(
          (index) =>
            index - 1
        );

        setLiked(false);

        return;
      }

      /*
       * Previous Story from same user.
       */
      if (
        storyIndex > 0 &&
        currentGroup
      ) {
        const previousStory =
          currentGroup.stories[
            storyIndex - 1
          ];

        const previousMediaIndex =
          Math.max(
            0,
            (previousStory?.media
              ?.length || 1) - 1
          );

        setStoryIndex(
          (index) =>
            index - 1
        );

        setMediaIndex(
          previousMediaIndex
        );

        setLiked(false);

        return;
      }

      /*
       * Previous user's Story.
       */
      if (groupIndex > 0) {
        const previousGroup =
          group[
            groupIndex - 1
          ];

        const previousStoryIndex =
          Math.max(
            0,
            previousGroup.stories
              .length - 1
          );

        const previousStory =
          previousGroup.stories[
            previousStoryIndex
          ];

        const previousMediaIndex =
          Math.max(
            0,
            (previousStory?.media
              ?.length || 1) - 1
          );

        setGroupIndex(
          (index) =>
            index - 1
        );

        setStoryIndex(
          previousStoryIndex
        );

        setMediaIndex(
          previousMediaIndex
        );

        setLiked(false);

        return;
      }
    }, [
      clearStoryTimer,
      mediaIndex,
      storyIndex,
      groupIndex,
      currentGroup,
      group,
    ]);

  /*
   * ==========================================================
   * RECORD VIEW WHEN STORY IS FIRST DISPLAYED
   * ==========================================================
   *
   * IMPORTANT:
   *
   * This effect records the view when a new Story/media
   * becomes visible.
   *
   * We no longer call recordView() from both this effect
   * AND goNext() for the same transition unnecessarily.
   */

  const viewedStoryRef =
    useRef<string>("");

  useEffect(() => {
    if (
      !currentStory?._id ||
      !currentMedia
    ) {
      return;
    }

    const viewKey =
      `${currentStory._id}-${mediaIndex}`;

    /*
     * Avoid sending the exact same view request
     * repeatedly because React effects can run more
     * than once during development.
     */
    if (
      viewedStoryRef.current ===
      viewKey
    ) {
      return;
    }

    viewedStoryRef.current =
      viewKey;

    recordView(
      false,
      mediaIndex
    );
  }, [
    currentStory?._id,
    mediaIndex,
    currentMedia,
    recordView,
  ]);

  /*
   * ==========================================================
   * AUTO ADVANCE
   * ==========================================================
   */

  useEffect(() => {
    clearStoryTimer();

    if (
      paused ||
      !currentMedia
    ) {
      return;
    }

    timerRef.current =
      setTimeout(() => {
        goNext();
      }, STORY_DURATION);

    return () => {
      clearStoryTimer();
    };
  }, [
    paused,
    currentMedia,
    goNext,
    clearStoryTimer,
  ]);

  /*
   * ==========================================================
   * EXPIRED STORY CHECK
   * ==========================================================
   */

  useEffect(() => {
    if (
      !currentStory?.expiresAt
    ) {
      return;
    }

    const remaining =
      new Date(
        currentStory.expiresAt
      ).getTime() -
      Date.now();

    if (remaining <= 0) {
      goNext();

      return;
    }

    const timer =
      setTimeout(
        () => {
          goNext();
        },
        remaining
      );

    return () => {
      clearTimeout(timer);
    };
  }, [
    currentStory?.expiresAt,
    goNext,
  ]);

  /*
   * ==========================================================
   * KEYBOARD CONTROLS
   * ==========================================================
   */

  useEffect(() => {
    const handler = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        onClose();

        return;
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        goNext();

        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        goPrev();
      }
    };

    window.addEventListener(
      "keydown",
      handler
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handler
      );

      document.body.style.overflow =
        "";
    };
  }, [
    onClose,
    goNext,
    goPrev,
  ]);

  /*
   * ==========================================================
   * REACT TO STORY
   * ==========================================================
   */

  const react = async () => {
    if (!currentStory?._id) {
      return;
    }

    try {
      if (liked) {
        await axiosInstance.delete(
          `/api/stories/${currentStory._id}/reaction`
        );

        setLiked(false);
      } else {
        await axiosInstance.post(
          `/api/stories/${currentStory._id}/reaction`,
          {
            reaction: "like",
          }
        );

        setLiked(true);
      }
    } catch (error: unknown) {
      const apiError =
        error as ApiError;

      console.error(
        "Story reaction error:",
        apiError.response?.data ||
          apiError.message ||
          error
      );

      /*
       * Story may have expired while
       * the viewer was open.
       */
      if (
        apiError.response
          ?.status === 404
      ) {
        onClose();
      }
    }
  };

  /*
   * ==========================================================
   * SEND REPLY
   * ==========================================================
   */

  const sendReply = async () => {
    const text =
      reply.trim();

    if (
      !text ||
      !currentStory?._id ||
      sendingReply
    ) {
      return;
    }

    try {
      setSendingReply(true);

      await axiosInstance.post(
        `/api/stories/${currentStory._id}/reply`,
        {
          text,
        }
      );

      /*
       * Clear input after
       * successful reply.
       */
      setReply("");
    } catch (error: unknown) {
      const apiError =
        error as ApiError;

      console.error(
        "Story reply error:",
        apiError.response?.data ||
          apiError.message ||
          error
      );

      /*
       * If Story expired,
       * close the viewer.
       */
      if (
        apiError.response
          ?.status === 404
      ) {
        onClose();
      }
    } finally {
      setSendingReply(false);
    }
  };

  /*
   * ==========================================================
   * DELETE STORY
   * ==========================================================
   */

  const deleteStory =
    async () => {
      if (
        !currentStory?._id ||
        !isOwner
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this story before it expires?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await axiosInstance.delete(
          `/api/stories/${currentStory._id}`
        );

        /*
         * Close viewer after successful
         * deletion.
         */
        onClose();
      } catch (error: unknown) {
        const apiError =
          error as ApiError;

        console.error(
          "Delete story error:",
          apiError.response?.data ||
            apiError.message ||
            error
        );
      }
    };

  /*
   * ==========================================================
   * STORY AGE
   * ==========================================================
   */

  const getStoryAge =
    useMemo(() => {
      if (
        !currentStory?.createdAt
      ) {
        return "now";
      }

      const createdAt =
        new Date(
          currentStory.createdAt
        ).getTime();

      const minutes = Math.floor(
        (Date.now() -
          createdAt) /
          (1000 * 60)
      );

      if (minutes < 1) {
        return "now";
      }

      if (minutes < 60) {
        return `${minutes}m`;
      }

      return `${Math.min(
        24,
        Math.floor(
          minutes / 60
        )
      )}h`;
    }, [
      currentStory?.createdAt,
    ]);

  /*
   * ==========================================================
   * SAFETY CHECK
   * ==========================================================
   */

  if (
    !currentGroup ||
    !currentStory ||
    !currentMedia
  ) {
    return null;
  }

  /*
   * ==========================================================
   * PROFILE IMAGE
   * ==========================================================
   */

  const profileImage =
    currentGroup.user
      .profilePicture ||
    currentGroup.user
      .profilePic ||
    "";

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="fixed inset-0 z-200 bg-black flex items-center justify-center">
      <div className="relative w-full max-w-100 h-dvh bg-black overflow-hidden">
        {/* ==================================================
            STORY MEDIA
        ================================================== */}

        {currentMedia.type ===
        "video" ? (
          <video
            ref={videoRef}
            key={`${currentStory._id}-${mediaIndex}`}
            src={currentMedia.url}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={() => {
              goNext();
            }}
          />
        ) : (
          <img
            key={`${currentStory._id}-${mediaIndex}`}
            src={currentMedia.url}
            alt="Story"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* ==================================================
            GRADIENT OVERLAY
        ================================================== */}

        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-transparent to-black/65 pointer-events-none" />

        {/* ==================================================
            STORY PROGRESS
        ================================================== */}

        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {media.map(
            (_, index) => (
              <div
                key={index}
                className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full bg-white ${
                    index <
                    mediaIndex
                      ? "w-full"
                      : index >
                        mediaIndex
                      ? "w-0"
                      : "w-full"
                  }`}
                  style={
                    index ===
                    mediaIndex
                      ? {
                          animation: `storyFill ${STORY_DURATION}ms linear forwards`,

                          animationPlayState:
                            paused
                              ? "paused"
                              : "running",
                        }
                      : undefined
                  }
                />
              </div>
            )
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-white/80">
  <span className="inline-flex items-center gap-1">
    <Eye size={14} />

    {Number(
      currentStory.viewsCount ?? 0
    )}

    views
  </span>

  {isOwner && (
    <span>
      {Number(
        currentStory.uniqueViewersCount ?? 0
      )}{" "}
      unique viewers
    </span>
  )}
</div>
        {/* ==================================================
            STORY HEADER
        ================================================== */}

        <div className="absolute top-7 left-3 right-3 z-20 flex items-center justify-between">
  <div className="flex items-center gap-2">
    {/* Profile image */}
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

    {/* Username */}
    <span className="text-white text-sm font-semibold">
      {currentGroup.user.username}
    </span>

    {/* Story age */}
    <span className="text-white/70 text-xs">
      · {getStoryAge}
    </span>
  </div>

  {/* Header actions */}
  <div className="flex items-center gap-2">
    {isOwner && (
      <>
        {/* Story views */}
        <div
          className="flex items-center gap-1.5
                     text-white text-xs
                     bg-black/40
                     rounded-full
                     px-3 py-1.5"
        >
          <Eye size={14} />

          <span>
            {Number(
              currentStory.viewsCount ?? 0
            )}
          </span>

          <span>
            views
          </span>
        </div>

        {/* Analytics */}
        <button
          type="button"
          onClick={() =>
            setShowAnalytics(true)
          }
          className="text-white p-2"
          aria-label="Story analytics"
        >
          <BarChart3 size={20} />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={deleteStory}
          className="text-white text-xs px-2 py-1 rounded bg-black/40"
        >
          Delete
        </button>
      </>
    )}

    {/* Close */}
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

        {/* ==================================================
            LEFT CLICK AREA
        ================================================== */}

        <button
          type="button"
          aria-label="Previous story"
          onClick={goPrev}
          onPointerDown={() =>
            setPaused(true)
          }
          onPointerUp={() =>
            setPaused(false)
          }
          onPointerCancel={() =>
            setPaused(false)
          }
          className="absolute left-0 top-20 bottom-20 w-1/3 z-10"
        />

        {/* ==================================================
            RIGHT CLICK AREA
        ================================================== */}

        <button
          type="button"
          aria-label="Next story"
          onClick={goNext}
          onPointerDown={() =>
            setPaused(true)
          }
          onPointerUp={() =>
            setPaused(false)
          }
          onPointerCancel={() =>
            setPaused(false)
          }
          className="absolute right-0 top-20 bottom-20 w-1/3 z-10"
        />

        {/* ==================================================
            REPLY / REACTION BAR
        ================================================== */}

        {!isOwner && (
          <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
            {/* Reply input */}
            <input
              value={reply}
              onChange={(
                event
              ) =>
                setReply(
                  event.target
                    .value
                )
              }
              onFocus={() =>
                setPaused(true)
              }
              onBlur={() =>
                setPaused(false)
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  sendReply();
                }
              }}
              maxLength={500}
              placeholder="Reply to story..."
              className="min-w-0 flex-1 rounded-full border border-white/60 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/70 outline-none"
            />

            {/* Like */}
            <button
              type="button"
              onClick={react}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-black/40"
              aria-label="Like story"
            >
              <Heart
                size={22}
                fill={
                  liked
                    ? "currentColor"
                    : "none"
                }
              />
            </button>

            {/* Send */}
            <button
              type="button"
              onClick={
                sendReply
              }
              disabled={
                !reply.trim() ||
                sendingReply
              }
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-black/40 disabled:opacity-40"
              aria-label="Send reply"
            >
              <Send size={20} />
            </button>
          </div>
        )}

        {/* ==================================================
            DESKTOP PREVIOUS BUTTON
        ================================================== */}

        {groupIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="hidden md:flex absolute -left-15 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 items-center justify-center z-30"
            aria-label="Previous user story"
          >
            <ChevronLeft
              size={22}
            />
          </button>
        )}

        {/* ==================================================
            DESKTOP NEXT BUTTON
        ================================================== */}

        {groupIndex <
          group.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="hidden md:flex absolute -right-15 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 items-center justify-center z-30"
            aria-label="Next user story"
          >
            <ChevronRight
              size={22}
            />
          </button>
        )}
      </div>

      {/* ====================================================
          STORY ANALYTICS
      ==================================================== */}

      {showAnalytics &&
        isOwner &&
        currentStory?._id && (
          <StoryAnalytics
            storyId={
              currentStory._id
            }
            onClose={() =>
              setShowAnalytics(
                false
              )
            }
          />
        )}
    </div>
  );
}

/*
 * ============================================================
 * OPTIONAL HELPER TYPE
 * ============================================================
 *
 * Kept here for compatibility if additional UI elements
 * are added later.
 */
type StoryViewerContentProps = {
  children?: ReactNode;
};
"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MoreHorizontal,
  Send,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";


const STORY_DURATION = 5000;


/* =========================================================
   TYPES
========================================================= */

type StoryMedia = {
  _id?: string;
  url: string;
  type: "image" | "video";
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


/* =========================================================
   STORY VIEWER
========================================================= */

const StoryViewer = ({
  group,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) => {

  const [groupIndex, setGroupIndex] =
    useState(initialGroupIndex);

  const [storyIndex, setStoryIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const [liked, setLiked] =
    useState(false);

  const [reply, setReply] =
    useState("");


  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const holdTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHoldingRef =
    useRef(false);


  /* =========================================================
     CURRENT GROUP
  ========================================================= */

  const currentGroup =
    group[groupIndex];


  const totalStories =
    currentGroup?.stories?.length ?? 0;


  /* =========================================================
     CURRENT STORY
     
     IMPORTANT:
     This is declared BEFORE any useEffect that uses it.
  ========================================================= */

  const currentStory =
    currentGroup?.stories?.[storyIndex];


  /* =========================================================
     NEXT STORY
  ========================================================= */

  const goNext = useCallback(() => {

    if (!currentGroup) {
      onClose();
      return;
    }


    if (storyIndex < totalStories - 1) {

      setStoryIndex(
        (index) => index + 1
      );

      setLiked(false);

      return;
    }


    /*
     * Move to next user's story.
     */

    if (groupIndex < group.length - 1) {

      setGroupIndex(
        (index) => index + 1
      );

      setStoryIndex(0);

      setLiked(false);

      return;
    }


    /*
     * No more stories.
     */

    onClose();

  }, [
    currentGroup,
    storyIndex,
    totalStories,
    groupIndex,
    group.length,
    onClose,
  ]);


  /* =========================================================
     PREVIOUS STORY
  ========================================================= */

  const goPrev = useCallback(() => {

    if (storyIndex > 0) {

      setStoryIndex(
        (index) => index - 1
      );

      setLiked(false);

      return;
    }


    if (groupIndex > 0) {

      setGroupIndex(
        (index) => index - 1
      );

      setStoryIndex(0);

      setLiked(false);
    }

  }, [
    storyIndex,
    groupIndex,
  ]);


  /* =========================================================
     GO TO USER'S STORY GROUP
  ========================================================= */

  const goToGroup = (
    index: number
  ) => {

    if (
      index < 0 ||
      index >= group.length
    ) {
      return;
    }

    setGroupIndex(index);

    setStoryIndex(0);

    setLiked(false);
  };


  /* =========================================================
     24-HOUR STORY EXPIRATION
     
     If the current story expires while the viewer is open,
     automatically move to the next story.
  ========================================================= */

  useEffect(() => {

    if (!currentStory?.expiresAt) {
      return;
    }


    const expiresAt =
      new Date(
        currentStory.expiresAt
      ).getTime();


    const remainingTime =
      expiresAt - Date.now();


    /*
     * Story has already expired.
     */

    if (remainingTime <= 0) {

      goNext();

      return;
    }


    /*
     * Wait exactly until the story expires.
     */

    const expirationTimer =
      setTimeout(() => {
        goNext();
      }, remainingTime);


    return () => {
      clearTimeout(
        expirationTimer
      );
    };

  }, [
    currentStory,
    goNext,
  ]);


  /* =========================================================
     NORMAL STORY AUTO-ADVANCE
  ========================================================= */

  useEffect(() => {

    if (
      paused ||
      !currentStory
    ) {
      return;
    }


    timerRef.current =
      setTimeout(
        goNext,
        STORY_DURATION
      );


    return () => {

      if (timerRef.current) {

        clearTimeout(
          timerRef.current
        );

        timerRef.current = null;
      }

    };

  }, [
    groupIndex,
    storyIndex,
    paused,
    currentStory,
    goNext,
  ]);


  /* =========================================================
     KEYBOARD NAVIGATION
  ========================================================= */

  useEffect(() => {

    const handler = (
      event: KeyboardEvent
    ) => {

      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        goPrev();
      }
    };


    window.addEventListener(
      "keydown",
      handler
    );


    return () => {

      window.removeEventListener(
        "keydown",
        handler
      );

    };

  }, [
    onClose,
    goNext,
    goPrev,
  ]);


  /* =========================================================
     LOCK BODY SCROLL
  ========================================================= */

  useEffect(() => {

    document.body.style.overflow =
      "hidden";


    return () => {

      document.body.style.overflow =
        "";

    };

  }, []);


  /* =========================================================
     HOLD / PAUSE
  ========================================================= */

  const handlePointerDown = () => {

    holdTimerRef.current =
      setTimeout(() => {

        isHoldingRef.current =
          true;

        setPaused(true);

      }, 180);
  };


  const handlePointerUp = (
    side: "left" | "right"
  ) => {

    if (holdTimerRef.current) {

      clearTimeout(
        holdTimerRef.current
      );

      holdTimerRef.current =
        null;
    }


    if (isHoldingRef.current) {

      isHoldingRef.current =
        false;

      setPaused(false);

      return;
    }


    if (side === "left") {
      goPrev();
    } else {
      goNext();
    }
  };


  /* =========================================================
     NO STORY
  ========================================================= */

  if (
    !currentGroup ||
    !currentStory
  ) {
    return null;
  }


  /* =========================================================
     CURRENT MEDIA
  ========================================================= */

  const currentMedia =
    currentStory.media?.[0];


  if (!currentMedia) {
    return null;
  }


  /* =========================================================
     USER PROFILE IMAGE
  ========================================================= */

  const profileImage =
    currentGroup.user.profilePicture ||
    currentGroup.user.profilePic ||
    "";


  /* =========================================================
     STORY AGE
  ========================================================= */

  const getStoryAge = () => {

    const created =
      new Date(
        currentStory.createdAt
      ).getTime();

    const diff =
      Date.now() - created;


    const minutes =
      Math.floor(
        diff / (1000 * 60)
      );


    if (minutes < 1) {
      return "now";
    }


    if (minutes < 60) {
      return `${minutes}m`;
    }


    const hours =
      Math.floor(
        minutes / 60
      );


    if (hours < 24) {
      return `${hours}h`;
    }


    return "24h";
  };


  return (
    <div className="fixed inset-0 z-200 bg-black flex items-center justify-center">

      {/* =====================================================
          DESKTOP PREVIOUS / NEXT USER
      ===================================================== */}

      <div
        className="
          hidden
          md:flex
          items-center
          gap-2
          absolute
          left-1/2
          -translate-x-1/2
          w-full
          max-w-200
          px-4
          justify-between
          pointer-events-none
        "
      >

        {groupIndex > 0 && (
          <button
            type="button"
            onClick={() =>
              goToGroup(
                groupIndex - 1
              )
            }
            className="
              pointer-events-auto
              bg-white/90
              hover:bg-white
              rounded-full
              p-2
              shadow-lg
              transition-all
              shrink-0
            "
          >
            <ChevronLeft
              size={22}
              className="text-ig-text"
            />
          </button>
        )}


        {groupIndex <
          group.length - 1 && (
          <button
            type="button"
            onClick={() =>
              goToGroup(
                groupIndex + 1
              )
            }
            className="
              pointer-events-auto
              bg-white/90
              hover:bg-white
              rounded-full
              p-2
              shadow-lg
              transition-all
              ml-auto
              shrink-0
            "
          >
            <ChevronRight
              size={22}
              className="text-ig-text"
            />
          </button>
        )}

      </div>


      {/* =====================================================
          STORY CONTAINER
      ===================================================== */}

      <div
        className="
          relative
          w-full
          max-w-100
          bg-black
          overflow-hidden
        "
        style={{
          height: "100dvh",
        }}
      >

        {/* ===================================================
            MEDIA
        =================================================== */}

        {currentMedia.type ===
          "video" ? (

          <video
            key={currentStory._id}
            src={currentMedia.url}
            autoPlay
            muted
            playsInline
            className="
              absolute
              inset-0
              w-full
              h-full
              object-cover
            "
          />

        ) : (

          <img
            key={currentStory._id}
            src={currentMedia.url}
            alt=""
            className="
              absolute
              inset-0
              w-full
              h-full
              object-cover
            "
          />

        )}


        {/* ===================================================
            DARK GRADIENT
        =================================================== */}

        <div
          className="
            absolute
            inset-0
            bg-linear-to-b
            from-black/50
            via-transparent
            to-black/50
            pointer-events-none
          "
        />


        {/* ===================================================
            PROGRESS BARS
        =================================================== */}

        <div
          className="
            absolute
            top-3
            left-3
            right-3
            flex
            gap-1
            z-10
            pointer-events-none
          "
        >

          {currentGroup.stories.map(
            (_, index) => (

              <div
                key={index}
                className="
                  flex-1
                  h-0.5
                  bg-white/40
                  rounded-full
                  overflow-hidden
                "
              >

                {index <
                  storyIndex ? (

                  <div
                    className="
                      h-full
                      w-full
                      bg-white
                    "
                  />

                ) : index ===
                  storyIndex ? (

                  <div
                    key={`${groupIndex}-${storyIndex}`}
                    className="
                      h-full
                      bg-white
                      rounded-full
                    "
                    style={{
                      animation: `storyFill ${STORY_DURATION}ms linear forwards`,
                      animationPlayState:
                        paused
                          ? "paused"
                          : "running",
                    }}
                  />

                ) : (

                  <div
                    className="
                      h-full
                      w-0
                      bg-white
                    "
                  />

                )}

              </div>

            )
          )}

        </div>


        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
            absolute
            top-7
            left-3
            right-3
            flex
            items-center
            justify-between
            z-10
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              pointer-events-none
            "
          >

            <div
              className="
                w-8
                h-8
                rounded-full
                overflow-hidden
                border-2
                border-white
                shrink-0
              "
            >

              {profileImage ? (
                <img
                  src={profileImage}
                  alt=""
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />
              ) : (
                <div
                  className="
                    w-full
                    h-full
                    bg-gray-500
                  "
                />
              )}

            </div>


            <span
              className="
                text-white
                text-sm
                font-semibold
                drop-shadow
              "
            >
              {currentGroup.user.username}
            </span>


            <span
              className="
                text-white/60
                text-xs
              "
            >
              · {getStoryAge()}
            </span>

          </div>


          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <button
              type="button"
              className="
                text-white
                hover:opacity-70
                transition-opacity
              "
            >
              <MoreHorizontal
                size={20}
              />
            </button>


            <button
              type="button"
              onClick={onClose}
              className="
                text-white
                hover:opacity-70
                transition-opacity
              "
            >
              <X
                size={20}
              />
            </button>

          </div>

        </div>


        {/* ===================================================
            TAP NAVIGATION
        =================================================== */}

        <div
          className="
            absolute
            inset-0
            flex
          "
          style={{
            top: 60,
            bottom: 80,
          }}
        >

          {/* LEFT */}

          <div
            className="
              w-1/3
              h-full
              cursor-pointer
              select-none
            "
            onPointerDown={
              handlePointerDown
            }
            onPointerUp={() =>
              handlePointerUp("left")
            }
          />


          {/* RIGHT */}

          <div
            className="
              flex-1
              h-full
              cursor-pointer
              select-none
            "
            onPointerDown={
              handlePointerDown
            }
            onPointerUp={() =>
              handlePointerUp("right")
            }
          />

        </div>


        {/* ===================================================
            PAUSE INDICATOR
        =================================================== */}

        {paused && (
          <div
            className="
              absolute
              inset-0
              flex
              items-center
              justify-center
              pointer-events-none
            "
          >

            <div
              className="
                flex
                gap-2
              "
            >

              <div
                className="
                  w-1.5
                  h-8
                  bg-white
                  rounded-full
                "
              />

              <div
                className="
                  w-1.5
                  h-8
                  bg-white
                  rounded-full
                "
              />

            </div>

          </div>
        )}


        {/* ===================================================
            REPLY BAR
        =================================================== */}

        <div
          className="
            absolute
            bottom-5
            left-3
            right-3
            flex
            items-center
            gap-3
            z-10
          "
        >

          <input
            type="text"
            value={reply}
            onChange={(event) =>
              setReply(
                event.target.value
              )
            }
            placeholder={`Reply to ${currentGroup.user.username}…`}
            className="
              flex-1
              bg-transparent
              border
              border-white/50
              rounded-full
              px-4
              py-2
              text-white
              text-sm
              placeholder:text-white/60
              focus:outline-none
              focus:border-white
              transition-colors
            "
            onFocus={() =>
              setPaused(true)
            }
            onBlur={() => {

              if (!reply) {
                setPaused(false);
              }

            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          />


          <button
            type="button"
            onClick={(event) => {

              event.stopPropagation();

              setLiked(
                (value) => !value
              );

            }}
            className="
              hover:scale-110
              transition-transform
              active:scale-95
            "
          >

            <Heart
              size={26}
              strokeWidth={1.5}
              className={
                liked
                  ? "fill-[#ed4956] text-[#ed4956]"
                  : "text-white"
              }
            />

          </button>


          <button
            type="button"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="
              text-white
              hover:opacity-70
            "
          >

            <Send
              size={24}
              strokeWidth={1.5}
            />

          </button>

        </div>

      </div>

    </div>
  );
};


export default StoryViewer;
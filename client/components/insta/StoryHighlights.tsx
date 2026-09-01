"use client";

import {
  Plus,
  Trash2,
  X,
  Check,
  Play,
  Eye,
  RefreshCw,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import axiosInstance from "@/lib/axios";
import HighlightViewer from "./HighlightViewer";

/* =========================================================
   TYPES
========================================================= */

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
  status?:
    | "active"
    | "archived"
    | "deleted";

  /*
   * Story analytics counters.
   */
  viewsCount?: number;
  uniqueViewersCount?: number;
}

interface Highlight {
  _id: string;
  title: string;
  coverUrl?: string;
  stories: ArchivedStory[];

  /*
   * Highlight analytics.
   */
  totalViews?: number;
  uniqueViewers?: number;
}

interface HighlightAnalytics {
  highlightId: string;
  title: string;
  totalViews: number;
  uniqueViewers: number;

  stories: Array<{
    storyId: string;
    views: number;
  }>;
}

/* =========================================================
   FORMAT NUMBER
========================================================= */

const formatCount = (
  value: number
) =>
  new Intl.NumberFormat(
    "en-US",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    }
  ).format(
    Math.max(
      0,
      Number(value) || 0
    )
  );

/* =========================================================
   NORMALIZE API RESPONSE
========================================================= */

const getResponseArray = <T,>(
  responseData: any,
  keys: string[]
): T[] => {
  for (const key of keys) {
    if (
      Array.isArray(
        responseData?.[key]
      )
    ) {
      return responseData[key];
    }
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  return [];
};

/* =========================================================
   COMPONENT
========================================================= */

export default function StoryHighlights() {
  const [
    highlights,
    setHighlights,
  ] = useState<Highlight[]>([]);

  const [
    archivedStories,
    setArchivedStories,
  ] = useState<ArchivedStory[]>([]);

  const [
    selectedStories,
    setSelectedStories,
  ] = useState<string[]>([]);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    viewingHighlight,
    setViewingHighlight,
  ] = useState<Highlight | null>(
    null
  );

  /* =======================================================
     AUTHENTICATION HEADER

     The server's protect middleware requires:

       Authorization: Bearer <token>

     The login store saves it as:

       accessToken
  ======================================================= */

  const getAuthHeaders = useCallback(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return {};
    }

    const token =
      localStorage.getItem(
        "accessToken"
      );

    if (!token) {
      return {};
    }

    return {
      Authorization:
        `Bearer ${token}`,
    };
  }, []);

  /* =======================================================
     LOAD HIGHLIGHT ANALYTICS
  ======================================================= */

  const loadHighlightAnalytics =
    useCallback(
      async (
        highlight: Highlight
      ): Promise<Highlight> => {
        try {
          const response =
            await axiosInstance.get(
              `/api/story-highlights/${highlight._id}/analytics`,
              {
                headers:
                  getAuthHeaders(),
              }
            );

          const analytics:
            HighlightAnalytics | undefined =
            response.data
              ?.analytics;

          if (!analytics) {
            return {
              ...highlight,
              totalViews: 0,
              uniqueViewers: 0,
            };
          }

          return {
            ...highlight,

            totalViews:
              Number(
                analytics.totalViews
              ) || 0,

            uniqueViewers:
              Number(
                analytics.uniqueViewers
              ) || 0,
          };
        } catch (analyticsError: any) {
          console.error(
            `Failed to load analytics for highlight ${highlight._id}:`,
            analyticsError
          );

          /*
           * If the analytics endpoint is unavailable,
           * fall back to Story-level counters.
           */
          const totalViews = (
            highlight.stories ||
            []
          ).reduce(
            (
              sum,
              story
            ) =>
              sum +
              Number(
                story.viewsCount ||
                  0
              ),
            0
          );

          /*
           * This fallback may count the same viewer more
           * than once across Stories. The backend analytics
           * endpoint is preferred because it calculates
           * Highlight-level unique viewers correctly.
           */
          const uniqueViewers = (
            highlight.stories ||
            []
          ).reduce(
            (
              sum,
              story
            ) =>
              sum +
              Number(
                story.uniqueViewersCount ||
                  0
              ),
            0
          );

          return {
            ...highlight,
            totalViews,
            uniqueViewers,
          };
        }
      },
      [getAuthHeaders]
    );

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          /*
           * localStorage is available only in browser.
           */
          if (
            typeof window ===
            "undefined"
          ) {
            return;
          }

          /*
           * Check authentication before making
           * protected API requests.
           */
          const token =
            localStorage.getItem(
              "accessToken"
            );

          if (!token) {
            setError(
              "Please login again to view Story Highlights."
            );

            return;
          }

          /*
           * Explicitly send the Bearer token.
           *
           * axios.js already does this automatically,
           * but sending it here as well makes this component
           * safe even if the interceptor is changed later.
           */
          const config = {
            headers:
              getAuthHeaders(),
          };

          /*
           * Load both:
           *
           * 1. Existing Highlights
           * 2. Archived Stories available for Highlights
           */
          const [
            highlightsResponse,
            storiesResponse,
          ] = await Promise.all([
            axiosInstance.get(
              "/api/story-highlights",
              config
            ),

            axiosInstance.get(
              "/api/stories/archive",
              config
            ),
          ]);

          /*
           * -------------------------------------------------
           * HIGHLIGHTS
           * -------------------------------------------------
           */

          const loadedHighlights =
            getResponseArray<Highlight>(
              highlightsResponse.data,
              [
                "highlights",
                "data",
              ]
            );

          /*
           * -------------------------------------------------
           * ARCHIVED STORIES
           * -------------------------------------------------
           */

          const loadedStories =
            getResponseArray<ArchivedStory>(
              storiesResponse.data,
              [
                "stories",
                "data",
              ]
            );

          const stories =
            loadedStories.filter(
              (
                story
              ) =>
                story.status !==
                "deleted"
            );

          /*
           * -------------------------------------------------
           * HIGHLIGHT ANALYTICS
           * -------------------------------------------------
           *
           * Load analytics for each Highlight.
           *
           * This provides:
           *
           * totalViews
           * uniqueViewers
           * per-story view counts
           *
           * from the backend.
           */

          const highlightsWithAnalytics =
            await Promise.all(
              loadedHighlights.map(
                (
                  highlight
                ) =>
                  loadHighlightAnalytics(
                    highlight
                  )
              )
            );

          setHighlights(
            highlightsWithAnalytics
          );

          setArchivedStories(
            stories
          );
        } catch (
          err: any
        ) {
          console.error(
            "Story highlights loading error:",
            err
          );

          /*
           * 401 = authentication problem.
           */
          if (
            err?.response
              ?.status === 401
          ) {
            setError(
              "Your login session has expired. Please login again."
            );

            return;
          }

          /*
           * Other server errors.
           */
          setError(
            err?.response
              ?.data
              ?.message ||
              "Failed to load story highlights."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        getAuthHeaders,
        loadHighlightAnalytics,
      ]
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =======================================================
     SELECT / UNSELECT STORY
  ======================================================= */

  const toggleStory = (
    storyId: string
  ) => {
    setSelectedStories(
      (previous) =>
        previous.includes(
          storyId
        )
          ? previous.filter(
              (id) =>
                id !== storyId
            )
          : [
              ...previous,
              storyId,
            ]
    );
  };

  /* =======================================================
     CREATE HIGHLIGHT
  ======================================================= */

  const handleCreateHighlight =
    async () => {
      setError("");

      if (
        !title.trim()
      ) {
        setError(
          "Please enter a highlight name."
        );

        return;
      }

      if (
        selectedStories.length ===
        0
      ) {
        setError(
          "Please select at least one story."
        );

        return;
      }

      try {
        setCreating(true);

        await axiosInstance.post(
          "/api/story-highlights",
          {
            title:
              title.trim(),

            storyIds:
              selectedStories,
          },
          {
            headers:
              getAuthHeaders(),
          }
        );

        /*
         * Reset form.
         */
        setTitle("");
        setSelectedStories([]);

        /*
         * Reload Highlights and analytics.
         */
        await loadData();
      } catch (
        err: any
      ) {
        console.error(
          "Create highlight error:",
          err
        );

        if (
          err?.response
            ?.status === 401
        ) {
          setError(
            "Your login session has expired. Please login again."
          );

          return;
        }

        setError(
          err?.response
            ?.data
            ?.message ||
            "Failed to create highlight."
        );
      } finally {
        setCreating(false);
      }
    };

  /* =======================================================
     DELETE HIGHLIGHT
  ======================================================= */

  const handleDeleteHighlight =
    async (
      highlightId: string
    ) => {
      if (
        !window.confirm(
          "Delete this highlight? Your Stories and analytics will not be deleted."
        )
      ) {
        return;
      }

      try {
        setDeleting(
          highlightId
        );

        await axiosInstance.delete(
          `/api/story-highlights/${highlightId}`,
          {
            headers:
              getAuthHeaders(),
          }
        );

        /*
         * Remove immediately from UI.
         */
        setHighlights(
          (previous) =>
            previous.filter(
              (
                highlight
              ) =>
                highlight._id !==
                highlightId
            )
        );

        /*
         * If the deleted Highlight is open,
         * close the viewer.
         */
        setViewingHighlight(
          (current) =>
            current?._id ===
            highlightId
              ? null
              : current
        );
      } catch (
        err: any
      ) {
        console.error(
          "Delete highlight error:",
          err
        );

        if (
          err?.response
            ?.status === 401
        ) {
          setError(
            "Your login session has expired. Please login again."
          );

          return;
        }

        setError(
          err?.response
            ?.data
            ?.message ||
            "Failed to delete highlight."
        );
      } finally {
        setDeleting(null);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
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

        <div className="flex items-center gap-2 text-sm text-ig-muted">
          <RefreshCw
            size={15}
            className="animate-spin"
          />

          Loading highlights...
        </div>

      </section>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <section className="w-full py-5">

      {/* ===================================================
          HEADER
      =================================================== */}

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

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">

          <p className="flex-1 text-sm text-red-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="text-red-500"
            aria-label="Close error"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ===================================================
          HIGHLIGHTS
      =================================================== */}

      {highlights.length >
      0 ? (
        <div className="flex gap-6 overflow-x-auto pb-5 scrollbar-hide">

          {highlights.map(
            (
              highlight
            ) => {

              const firstStory =
                highlight.stories?.[0];

              const firstMedia =
                firstStory?.media?.[0];

              const cover =
                highlight.coverUrl ||
                firstMedia?.url;

              const totalViews =
                Number(
                  highlight.totalViews ||
                    0
                );

              const uniqueViewers =
                Number(
                  highlight.uniqueViewers ||
                    0
                );

              return (
                <div
                  key={
                    highlight._id
                  }
                  className="relative shrink-0 w-24 flex flex-col items-center group"
                >

                  {/* ========================================
                      HIGHLIGHT CIRCLE
                  ======================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      setViewingHighlight(
                        highlight
                      )
                    }
                    className="w-18 h-18 rounded-full p-0.75 bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                    aria-label={`Open ${highlight.title} highlight with ${formatCount(
                      totalViews
                    )} views`}
                  >

                    <div className="w-full h-full rounded-full border-2 border-ig-surface overflow-hidden bg-ig-hover">

                      {cover ? (

                        firstMedia?.type ===
                        "video" ? (

                          <div className="relative w-full h-full">

                            <video
                              src={
                                cover
                              }
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 flex items-center justify-center">

                              <Play
                                size={
                                  18
                                }
                                className="text-white"
                                fill="white"
                              />

                            </div>

                          </div>

                        ) : (

                          <img
                            src={
                              cover
                            }
                            alt={
                              highlight.title
                            }
                            className="w-full h-full object-cover"
                          />

                        )

                      ) : (

                        <div className="w-full h-full flex items-center justify-center">

                          <span className="text-xl text-ig-muted">
                            +
                          </span>

                        </div>

                      )}

                    </div>

                  </button>

                  {/* ========================================
                      TITLE
                  ======================================== */}

                  <span className="mt-2 text-xs text-ig-text truncate max-w-24 text-center">
                    {
                      highlight.title
                    }
                  </span>

                  {/* ========================================
                      TOTAL VIEWS
                  ======================================== */}

                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-ig-muted">

                    <Eye
                      size={
                        11
                      }
                    />

                    <span>
                      {formatCount(
                        totalViews
                      )}
                    </span>

                    <span>
                      views
                    </span>

                  </div>

                  {/* ========================================
                      UNIQUE VIEWERS
                  ======================================== */}

                  <div className="text-[10px] text-ig-muted mt-0.5 text-center">
                    {formatCount(
                      uniqueViewers
                    )}{" "}
                    unique viewers
                  </div>

                  {/* ========================================
                      DELETE
                  ======================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteHighlight(
                        highlight._id
                      )
                    }
                    disabled={
                      deleting ===
                      highlight._id
                    }
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    aria-label="Delete highlight"
                  >

                    {deleting ===
                    highlight._id ? (

                      <RefreshCw
                        size={
                          11
                        }
                        className="animate-spin"
                      />

                    ) : (

                      <Trash2
                        size={
                          12
                        }
                      />

                    )}

                  </button>

                </div>
              );
            }
          )}

        </div>
      ) : (

        /* =================================================
           NO HIGHLIGHTS
        ================================================= */

        <div className="border border-dashed border-ig-border rounded-xl p-6 text-center mb-5">

          <div className="w-12 h-12 mx-auto rounded-full border border-ig-border flex items-center justify-center">

            <Plus
              size={
                22
              }
              className="text-ig-muted"
            />

          </div>

          <p className="text-sm font-semibold text-ig-text mt-3">
            No story highlights yet
          </p>

          <p className="text-xs text-ig-muted mt-1">
            Add your expired Stories to keep them on your profile.
          </p>

        </div>

      )}

      {/* ===================================================
          CREATE HIGHLIGHT
      =================================================== */}

      <div className="border border-ig-border rounded-xl p-5">

        <h3 className="text-sm font-semibold text-ig-text mb-3">
          Create New Highlight
        </h3>

        {/* =================================================
            TITLE
        ================================================= */}

        <input
          type="text"
          value={
            title
          }
          onChange={(
            event
          ) =>
            setTitle(
              event.target
                .value
            )
          }
          placeholder="Highlight name"
          maxLength={
            50
          }
          className="w-full px-3 py-2.5 mb-4 rounded-lg border border-ig-border bg-ig-surface text-ig-text text-sm outline-none focus:border-ig-blue"
        />

        {/* =================================================
            ARCHIVED STORIES
        ================================================= */}

        {archivedStories.length >
        0 ? (

          <>

            <p className="text-sm text-ig-muted mb-3">
              Select archived Stories:
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">

              {archivedStories.map(
                (
                  story
                ) => {

                  const media =
                    story.media?.[0];

                  const isSelected =
                    selectedStories.includes(
                      story._id
                    );

                  return (
                    <button
                      key={
                        story._id
                      }
                      type="button"
                      onClick={() =>
                        toggleStory(
                          story._id
                        )
                      }
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                        isSelected
                          ? "border-[#0095f6]"
                          : "border-transparent"
                      }`}
                    >

                      {/* =================================
                          MEDIA
                      ================================= */}

                      {media?.type ===
                      "video" ? (

                        <video
                          src={
                            media.url
                          }
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />

                      ) : (

                        <img
                          src={
                            media?.url
                          }
                          alt="Archived story"
                          className="w-full h-full object-cover"
                        />

                      )}

                      {/* =================================
                          SELECTED
                      ================================= */}

                      {isSelected && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">

                          <div className="w-7 h-7 rounded-full bg-[#0095f6] flex items-center justify-center">

                            <Check
                              size={
                                16
                              }
                              className="text-white"
                            />

                          </div>

                        </div>
                      )}

                      {/* =================================
                          STORY VIEW COUNT
                      ================================= */}

                      <div className="absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-white text-[9px] flex items-center justify-center gap-1">

                        <Eye
                          size={
                            9
                          }
                        />

                        <span>
                          {formatCount(
                            Number(
                              story.viewsCount ||
                                0
                            )
                          )}
                        </span>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

            {/* =============================================
                SELECTED COUNT
            ============================================= */}

            <p className="text-xs text-ig-muted mt-3">

              {
                selectedStories.length
              }{" "}

              {selectedStories.length ===
              1
                ? "story"
                : "stories"}{" "}
              selected

            </p>

          </>

        ) : (

          <div className="py-7 text-center border border-dashed border-ig-border rounded-lg">

            <p className="text-sm text-ig-text">
              No archived Stories available.
            </p>

            <p className="text-xs text-ig-muted mt-1">
              Stories will appear here after they expire.
            </p>

          </div>

        )}

        {/* =================================================
            CREATE ERROR
        ================================================= */}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">

            <p className="flex-1 text-sm text-red-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-500"
              aria-label="Close error"
            >
              <X
                size={
                  16
                }
              />
            </button>

          </div>
        )}

        {/* =================================================
            CREATE BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={
            handleCreateHighlight
          }
          disabled={
            creating ||
            selectedStories.length ===
              0 ||
            !title.trim()
          }
          className="w-full mt-4 py-2.5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >

          {creating
            ? "Creating..."
            : "Create Highlight"}

        </button>

      </div>

      {/* ===================================================
          HIGHLIGHT VIEWER
      =================================================== */}

      {viewingHighlight && (
        <HighlightViewer
          title={
            viewingHighlight.title
          }
          stories={
            viewingHighlight.stories
          }
          totalViews={
            viewingHighlight.totalViews ||
            0
          }
          uniqueViewers={
            viewingHighlight.uniqueViewers ||
            0
          }
          onClose={() =>
            setViewingHighlight(
              null
            )
          }
        />
      )}

    </section>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Eye,
  Users,
  Heart,
  MessageCircle,
  CheckCircle,
  X,
  BarChart3,
} from "lucide-react";

import { socket } from "@/lib/socket";
import axiosInstance from "@/lib/axios";

type Viewer = {
  _id: string;

  viewer: {
    _id?: string;
    username: string;
    fullName?: string;
    profilePicture?: string;
  };

  firstViewedAt: string;

  completedAt: string | null;
};

type ReactionBreakdown = {
  _id: string;
  count: number;
};

type TimelineItem = {
  _id: string;
  views: number;
};

type Analytics = {
  storyId?: string;

  status?: "active" | "archived";

  totalViews: number;

  uniqueViewers: number;

  reactions: {
    total: number;
    breakdown: ReactionBreakdown[];
  };

  replies: {
    total: number;
  };

  completedViews: number;

  completionRate: number;

  timeline: TimelineItem[];

  viewers: Viewer[];
};

type AnalyticsSocketUpdate = {
  storyId: string;

  viewsCount?: number;

  uniqueViewersCount?: number;

  completedViewsCount?: number;

  likesCount?: number;

  repliesCount?: number;
};

interface Props {
  storyId: string;
  onClose: () => void;
}

export default function StoryAnalytics({
  storyId,
  onClose,
}: Props) {
  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * Fetch analytics from backend.
   */
  const fetchAnalytics =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await axiosInstance.get(
            `/api/stories/${storyId}/analytics`
          );

        if (
          !response.data?.success
        ) {
          throw new Error(
            response.data?.message ||
              "Failed to load analytics"
          );
        }

        setAnalytics(
          response.data.analytics
        );
      } catch (error: any) {
        console.error(
          "Analytics fetch error:",
          error
        );

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load analytics"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [storyId]);

  /*
   * Initial analytics load.
   */
  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  /*
   * Real-time analytics.
   */
  useEffect(() => {
    if (!storyId) {
      return;
    }

    /*
     * Join Story-specific analytics room.
     */
    socket.emit(
      "join-story-analytics",
      storyId
    );

    /*
     * Handle real-time analytics update.
     */
    const handleUpdate = (
      update: AnalyticsSocketUpdate
    ) => {
      /*
       * Ignore updates belonging
       * to another Story.
       */
      if (
        update.storyId?.toString() !==
        storyId.toString()
      ) {
        return;
      }

      /*
       * Update the visible counters
       * immediately.
       */
      setAnalytics(
        (previous) => {
          if (!previous) {
            return previous;
          }

          const uniqueViewers =
            update.uniqueViewersCount ??
            previous.uniqueViewers;

          const completedViews =
            update.completedViewsCount ??
            previous.completedViews;

          /*
           * Recalculate completion rate.
           */
          const completionRate =
            uniqueViewers === 0
              ? 0
              : Number(
                  (
                    (completedViews /
                      uniqueViewers) *
                    100
                  ).toFixed(2)
                );

          return {
            ...previous,

            totalViews:
              update.viewsCount ??
              previous.totalViews,

            uniqueViewers,

            completedViews,

            completionRate,

            reactions: {
              ...previous.reactions,

              total:
                update.likesCount ??
                previous.reactions.total,
            },

            replies: {
              total:
                update.repliesCount ??
                previous.replies.total,
            },
          };
        }
      );

      /*
       * Refresh the viewer list,
       * timeline and reaction breakdown.
       *
       * Counters are already updated
       * immediately above, so the API
       * refresh is mainly for detailed
       * analytics data.
       */
      setRefreshing(true);

      fetchAnalytics();
    };

    socket.on(
      "story-analytics-updated",
      handleUpdate
    );

    /*
     * Cleanup.
     */
    return () => {
      socket.emit(
        "leave-story-analytics",
        storyId
      );

      socket.off(
        "story-analytics-updated",
        handleUpdate
      );
    };
  }, [
    storyId,
    fetchAnalytics,
  ]);

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <div className="fixed inset-0 z-200 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-ig-surface w-full max-w-4xl rounded-xl p-8 text-center">
          <p className="text-ig-text">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Error state.
   */
  if (error || !analytics) {
    return (
      <div className="fixed inset-0 z-200 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-ig-surface w-full max-w-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ig-text">
              Story Analytics
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="text-ig-secondary hover:text-ig-text"
              aria-label="Close analytics"
            >
              <X size={22} />
            </button>
          </div>

          <p className="text-sm text-red-500">
            {error ||
              "Analytics unavailable."}
          </p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchAnalytics();
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0095f6] text-white font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /*
   * Render analytics.
   */
  return (
    <div className="fixed inset-0 z-200 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-ig-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="p-5 border-b border-ig-border flex items-center justify-between sticky top-0 bg-ig-surface z-10">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3
                size={20}
                className="text-ig-text"
              />

              <h2 className="text-lg font-semibold text-ig-text">
                Story Analytics
              </h2>
            </div>

            {analytics.status ===
              "archived" && (
              <p className="text-xs text-ig-secondary mt-1">
                Archived Story
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {refreshing && (
              <span className="text-xs text-ig-secondary">
                Updating...
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-ig-secondary hover:text-ig-text p-1"
              aria-label="Close analytics"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* =================================================
            MAIN METRICS
        ================================================= */}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5">
          <Metric
            icon={
              <Eye size={18} />
            }
            label="Views"
            value={
              analytics.totalViews
            }
          />

          <Metric
            icon={
              <Users size={18} />
            }
            label="Unique Viewers"
            value={
              analytics.uniqueViewers
            }
          />

          <Metric
            icon={
              <Heart size={18} />
            }
            label="Reactions"
            value={
              analytics.reactions.total
            }
          />

          <Metric
            icon={
              <MessageCircle
                size={18}
              />
            }
            label="Replies"
            value={
              analytics.replies.total
            }
          />

          <Metric
            icon={
              <CheckCircle
                size={18}
              />
            }
            label="Completion"
            value={`${analytics.completionRate}%`}
          />
        </div>

        {/* =================================================
            COMPLETION SUMMARY
        ================================================= */}

        <div className="px-5 pb-5">
          <div className="border border-ig-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-ig-secondary"
                />

                <span className="font-semibold text-ig-text">
                  Completion Rate
                </span>
              </div>

              <span className="font-bold text-ig-text">
                {analytics.completionRate}%
              </span>
            </div>

            <div className="w-full h-2 bg-ig-border rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0095f6] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      analytics.completionRate
                    )
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-ig-secondary mt-2">
              {analytics.completedViews} of{" "}
              {analytics.uniqueViewers} unique
              viewers completed the story.
            </p>
          </div>
        </div>

        {/* =================================================
            REACTION BREAKDOWN
        ================================================= */}

        <div className="p-5 border-t border-ig-border">
          <h3 className="font-semibold text-ig-text mb-4">
            Reaction Breakdown
          </h3>

          {analytics.reactions
            .breakdown.length === 0 ? (
            <p className="text-sm text-ig-secondary">
              No reactions yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {analytics.reactions.breakdown.map(
                (item) => (
                  <div
                    key={item._id}
                    className="border border-ig-border rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-ig-text capitalize">
                      {item._id}
                    </span>

                    <span className="font-bold text-ig-text">
                      {item.count}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* =================================================
            VIEW TIMELINE
        ================================================= */}

        <div className="p-5 border-t border-ig-border">
          <h3 className="font-semibold text-ig-text mb-4">
            View Timeline
          </h3>

          {analytics.timeline.length ===
          0 ? (
            <p className="text-sm text-ig-secondary">
              No views yet.
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.timeline.map(
                (item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between border-b border-ig-border py-2"
                  >
                    <span className="text-sm text-ig-secondary">
                      {item._id}
                    </span>

                    <span className="font-semibold text-ig-text">
                      {item.views}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* =================================================
            VIEWERS
        ================================================= */}

        <div className="p-5 border-t border-ig-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ig-text">
              Viewers
            </h3>

            <span className="text-xs text-ig-secondary">
              {analytics.viewers.length} shown
            </span>
          </div>

          {analytics.viewers.length ===
          0 ? (
            <p className="text-sm text-ig-secondary">
              No viewers yet.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.viewers.map(
                (item) => {
                  const profilePicture =
                    item.viewer
                      ?.profilePicture;

                  return (
                    <div
                      key={item._id}
                      className="flex items-center gap-3"
                    >
                      {profilePicture ? (
                        <img
                          src={
                            profilePicture
                          }
                          alt={
                            item.viewer
                              ?.username ||
                            "Viewer"
                          }
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-ig-border flex items-center justify-center">
                          <Users
                            size={16}
                            className="text-ig-secondary"
                          />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-ig-text truncate">
                          {
                            item.viewer
                              ?.username
                          }
                        </p>

                        <p className="text-xs text-ig-secondary">
                          {item.completedAt
                            ? "Completed"
                            : "Viewed"}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="p-5 border-t border-ig-border">
          <p className="text-xs text-ig-secondary text-center">
            Analytics update automatically when
            viewers view, react, or reply to this
            story.
          </p>
        </div>
      </div>
    </div>
  );
}

/*
 * ANALYTICS METRIC CARD
 */
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-ig-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-ig-secondary">
        {icon}

        <span className="text-xs">
          {label}
        </span>
      </div>

      <p className="text-xl font-bold text-ig-text mt-2">
        {value}
      </p>
    </div>
  );
}

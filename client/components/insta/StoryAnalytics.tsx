"use client";

import {
  useEffect,
  useState,
} from "react";
import { socket } from "@/lib/socket";
import axiosInstance from "@/lib/axios";

import {
  Eye,
  Users,
  Heart,
  MessageCircle,
  CheckCircle,
} from "lucide-react";

type Viewer = {
  _id: string;
  viewer: {
    username: string;
    fullName: string;
    profilePicture: string;
  };
  firstViewedAt: string;
  completedAt: string | null;
};

type Analytics = {
  totalViews: number;
  uniqueViewers: number;

  reactions: {
    total: number;
    breakdown: {
      _id: string;
      count: number;
    }[];
  };

  replies: {
    total: number;
  };

  completedViews: number;

  completionRate: number;

  timeline: {
    _id: string;
    views: number;
  }[];

  viewers: Viewer[];
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

  const fetchAnalytics =
    async () => {
      try {
        const response =
          await axiosInstance.get(
            `/api/stories/${storyId}/analytics`
          );

        setAnalytics(
          response.data.analytics
        );
      } catch (error) {
        console.error(
          "Analytics fetch error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
  socket.emit(
    "join-story-analytics",
    storyId
  );

  const handleUpdate = (
    update: any
  ) => {
    if (
      update.storyId !== storyId
    ) {
      return;
    }

    setAnalytics(
      (previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,

          totalViews:
            update.viewsCount ??
            previous.totalViews,

          uniqueViewers:
            update.uniqueViewersCount ??
            previous.uniqueViewers,

          completedViews:
            update.completedViewsCount ??
            previous.completedViews,

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

          completionRate:
            update.uniqueViewersCount
              ? Number(
                  (
                    (update.completedViewsCount /
                      update.uniqueViewersCount) *
                    100
                  ).toFixed(2)
                )
              : previous.completionRate,
        };
      }
    );

    /*
     * Refresh viewer list and timeline
     * after an analytics event.
     */
    fetchAnalytics();
  };

  socket.on(
    "story-analytics-updated",
    handleUpdate
  );

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
}, [storyId]);

  useEffect(() => {
    fetchAnalytics();
  }, [storyId]);

  useEffect(() => {
    const socket =
      // your existing socket instance
      undefined;

    /*
     * Connect your existing socket.io-client
     * instance here.
     */
  }, [storyId]);

  if (loading) {
    return (
      <div className="p-6">
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        Analytics unavailable.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-200 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-ig-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
        <div className="p-5 border-b border-ig-border flex justify-between">
          <h2 className="text-lg font-semibold text-ig-text">
            Story Analytics
          </h2>

          <button
            onClick={onClose}
            className="text-ig-secondary"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5">
          <Metric
            icon={<Eye size={18} />}
            label="Views"
            value={
              analytics.totalViews
            }
          />

          <Metric
            icon={<Users size={18} />}
            label="Unique Viewers"
            value={
              analytics.uniqueViewers
            }
          />

          <Metric
            icon={<Heart size={18} />}
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

        <div className="p-5">
          <h3 className="font-semibold text-ig-text mb-4">
            View Timeline
          </h3>

          <div className="space-y-2">
            {analytics.timeline.map(
              (item) => (
                <div
                  key={item._id}
                  className="flex justify-between border-b border-ig-border py-2"
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
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-ig-text mb-4">
            Viewers
          </h3>

          <div className="space-y-3">
            {analytics.viewers.map(
              (item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3"
                >
                  <img
                    src={
                      item.viewer
                        .profilePicture
                    }
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />

                  <div>
                    <p className="font-semibold text-sm text-ig-text">
                      {
                        item.viewer
                          .username
                      }
                    </p>

                    <p className="text-xs text-ig-secondary">
                      {
                        item.completedAt
                          ? "Completed"
                          : "Viewed"
                      }
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
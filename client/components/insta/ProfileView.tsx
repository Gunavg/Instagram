"use client";

import {
  formatLikeCount,
  Post,
} from "@/lib/mock-data";

import {
  Grid3x3,
  Film,
  Bookmark,
  Tag,
  Settings,
  MoreHorizontal,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  ChevronLeft,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import PostModal from "./PostModal";
import axiosInstance from "@/lib/axios";
import StoryHighlights from "./StoryHighlights";

type Tab =
  | "posts"
  | "reels"
  | "saved"
  | "tagged";

const ProfileView = ({
  user,
  isOwnProfile,
}: any) => {
  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState<Tab>("posts");

  /*
   * ----------------------------------------------------------
   * FOLLOWING STATE
   * ----------------------------------------------------------
   *
   * isFollowing / following may not exist in every
   * response, so safely fall back to false.
   */
  const [following, setFollowing] =
    useState<boolean>(
      Boolean(
        user?.user?.isFollowing ??
          user?.user?.following ??
          false
      )
    );

  /*
   * ----------------------------------------------------------
   * FOLLOWER COUNT
   * ----------------------------------------------------------
   */
  const [followerCount, setFollowerCount] =
    useState<number>(
      Number(
        user?.user?.followersCount || 0
      )
    );

  /*
   * ----------------------------------------------------------
   * SELECTED POST
   * ----------------------------------------------------------
   */
  const [selectedPost, setSelectedPost] =
    useState<Post | null>(null);

  /*
   * ----------------------------------------------------------
   * SAFE POSTS ARRAY
   * ----------------------------------------------------------
   */
  const posts = Array.isArray(
    user?.posts
  )
    ? user.posts
    : [];

  /*
   * ==========================================================
   * FOLLOW / UNFOLLOW
   * ==========================================================
   */
  const handleFollowToggle =
    async () => {
      try {
        if (following) {
          await axiosInstance.delete(
            `/api/follow/${user.user._id}`
          );

          setFollowing(false);

          setFollowerCount(
            (previous) =>
              Math.max(
                0,
                previous - 1
              )
          );
        } else {
          await axiosInstance.post(
            `/api/follow/${user.user._id}`
          );

          setFollowing(true);

          setFollowerCount(
            (previous) =>
              previous + 1
          );
        }
      } catch (error) {
        console.error(
          "Follow toggle error:",
          error
        );
      }
    };

  /*
   * ==========================================================
   * PROFILE TABS
   * ==========================================================
   */
  const tabs = [
    {
      id: "posts" as Tab,
      icon: Grid3x3,
      label: "Posts",
    },

    {
      id: "reels" as Tab,
      icon: Film,
      label: "Reels",
    },

    ...(isOwnProfile
      ? [
          {
            id: "saved" as Tab,
            icon: Bookmark,
            label: "Saved",
          },
        ]
      : []),

    {
      id: "tagged" as Tab,
      icon: Tag,
      label: "Tagged",
    },
  ];

  /*
   * ==========================================================
   * SAFETY CHECK
   * ==========================================================
   */
  if (!user?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ig-surface">
        <p className="text-sm text-ig-text">
          User not found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-ig-surface md:bg-ig-ig min-h-screen">

      {/* ======================================================
          MOBILE TOP HEADER
      ====================================================== */}

      <header className="md:hidden fixed top-0 left-0 right-0 bg-ig-surface border-b border-ig-border z-50 h-11 flex items-center justify-between px-3">

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="p-1 text-ig-text active:opacity-60 transition-opacity"
          aria-label="Go back"
        >
          <ChevronLeft
            size={24}
            strokeWidth={1.5}
          />
        </button>

        <div className="flex items-center gap-1.5">

          <span className="text-sm font-semibold text-ig-text">
            {user.user.username}
          </span>

          {user.user.isVerified && (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              className="text-[#0095f6] fill-current"
              aria-label="Verified"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.177 14.232l-3.536-3.536 1.414-1.414 2.122 2.121 4.596-4.596 1.414 1.414-5.01 5.011z" />
            </svg>
          )}

        </div>

        <button
          type="button"
          className="p-1 text-ig-text active:opacity-60 transition-opacity"
          aria-label="More options"
        >
          <MoreHorizontal
            size={22}
            strokeWidth={1.5}
          />
        </button>

      </header>

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar />

      <div className="md:pl-18 xl:pl-61 pt-11 md:pt-0 pb-14 md:pb-0">

        <div className="max-w-233.75 mx-auto px-4 py-6 md:py-8">

          {/* ==================================================
              PROFILE HEADER
          ================================================== */}

          <div className="flex gap-5 md:gap-16 items-start mb-5 md:mb-8">

            {/* =================================================
                AVATAR
            ================================================= */}

            <div className="shrink-0">

              <div
                className={`rounded-full p-0.75 ${
                  isOwnProfile
                    ? ""
                    : "story-gradient"
                }`}
                style={
                  isOwnProfile
                    ? {
                        background:
                          "hsl(var(--ig-border))",
                      }
                    : undefined
                }
              >

                <div className="rounded-full bg-ig-surface p-0.75">

                  <img
                    src={
                      user.user
                        .profilePicture
                    }
                    alt={
                      user.user.username
                    }
                    className="w-19.25 h-19.25 md:w-37.5 md:h-37.5 rounded-full object-cover"
                  />

                </div>

              </div>

            </div>

            {/* =================================================
                PROFILE INFORMATION
            ================================================= */}

            <div className="flex-1 min-w-0 pt-1 md:pt-3">

              {/* ===============================================
                  USERNAME
              =============================================== */}

              <div className="flex items-center gap-2 mb-3">

                <h1 className="text-xl text-ig-text font-light leading-none">
                  {user.user.username}
                </h1>

                {user.user.isVerified && (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    className="text-[#0095f6] fill-current shrink-0 hidden md:block"
                    aria-label="Verified"
                  >
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.177 14.232l-3.536-3.536 1.414-1.414 2.122 2.121 4.596-4.596 1.414 1.414-5.01 5.011z" />
                  </svg>
                )}

              </div>

              {/* ===============================================
                  ACTION BUTTONS
              =============================================== */}

              {isOwnProfile ? (
                <div className="flex items-center gap-2 mb-4 flex-wrap">

                  <button
                    type="button"
                    className="flex-1 sm:flex-none px-4 py-1.75 text-sm font-semibold text-ig-text bg-ig-hover rounded-lg hover:bg-ig-border transition-colors text-center"
                  >
                    Edit profile
                  </button>

                  <button
                    type="button"
                    className="flex-1 sm:flex-none px-4 py-1.75 text-sm font-semibold text-ig-text bg-ig-hover rounded-lg hover:bg-ig-border transition-colors text-center"
                  >
                    View archive
                  </button>

                  <button
                    type="button"
                    className="p-1.75 text-ig-text hover:bg-ig-hover rounded-lg transition-colors"
                    aria-label="Settings"
                  >
                    <Settings
                      size={20}
                      strokeWidth={1.5}
                    />
                  </button>

                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4 flex-wrap">

                  <button
                    type="button"
                    onClick={
                      handleFollowToggle
                    }
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.75 text-sm font-semibold rounded-lg transition-colors ${
                      following
                        ? "bg-ig-hover text-ig-text hover:bg-ig-border"
                        : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                    }`}
                  >

                    {following ? (
                      <>
                        <UserCheck
                          size={15}
                        />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus
                          size={15}
                        />
                        Follow
                      </>
                    )}

                  </button>

                  <button
                    type="button"
                    className="flex-1 sm:flex-none px-4 py-1.75 text-sm font-semibold text-ig-text bg-ig-hover rounded-lg hover:bg-ig-border transition-colors text-center"
                  >
                    Message
                  </button>

                  <button
                    type="button"
                    className="p-1.75 text-ig-text bg-ig-hover rounded-lg hover:bg-ig-border transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal
                      size={20}
                    />
                  </button>

                </div>
              )}

              {/* ===============================================
                  DESKTOP STATS
              =============================================== */}

              <div className="hidden md:flex items-center gap-8 mb-4">

                <div className="text-sm text-ig-text">

                  <span className="font-semibold">
                    {posts.length}
                  </span>{" "}
                  posts

                </div>

                <button
                  type="button"
                  className="text-sm text-ig-text hover:opacity-70"
                >

                  <span className="font-semibold">
                    {formatLikeCount(
                      followerCount
                    )}
                  </span>{" "}
                  followers

                </button>

                <button
                  type="button"
                  className="text-sm text-ig-text hover:opacity-70"
                >

                  <span className="font-semibold">
                    {formatLikeCount(
                      Number(
                        user.user
                          .followingCount ||
                          0
                      )
                    )}
                  </span>{" "}
                  following

                </button>

              </div>

              {/* ===============================================
                  DESKTOP BIO
              =============================================== */}

              <div className="hidden md:block">

                <p className="text-sm font-semibold text-ig-text">
                  {
                    user.user
                      .fullName
                  }
                </p>

                {user.user.bio && (
                  <p className="text-sm text-ig-text whitespace-pre-line mt-0.5">
                    {
                      user.user
                        .bio
                    }
                  </p>
                )}

                {user.user.website && (
                  <a
                    href={
                      user.user.website.startsWith(
                        "http://"
                      ) ||
                      user.user.website.startsWith(
                        "https://"
                      )
                        ? user.user.website
                        : `https://${user.user.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-ig-blue hover:underline mt-0.5 block"
                  >
                    {
                      user.user
                        .website
                    }
                  </a>
                )}

              </div>

            </div>

          </div>

          {/* ==================================================
              MOBILE BIO
          ================================================== */}

          <div className="md:hidden mb-4 -mt-1">

            <p className="text-sm font-semibold text-ig-text">
              {
                user.user
                  .fullName
              }
            </p>

            {user.user.bio && (
              <p className="text-sm text-ig-text whitespace-pre-line mt-0.5 leading-snug">
                {
                  user.user
                    .bio
                }
              </p>
            )}

            {user.user.website && (
              <a
                href={
                  user.user.website.startsWith(
                    "http://"
                  ) ||
                  user.user.website.startsWith(
                    "https://"
                  )
                    ? user.user.website
                    : `https://${user.user.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-ig-blue mt-0.5 block"
              >
                {
                  user.user
                    .website
                }
              </a>
            )}

          </div>

          {/* ==================================================
              MOBILE STATS
          ================================================== */}

          <div className="md:hidden flex justify-around py-3 border-y border-ig-border mb-5">

            <button
              type="button"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-sm font-semibold text-ig-text">
                {formatLikeCount(
                  posts.length
                )}
              </span>

              <span className="text-xs text-ig-text">
                posts
              </span>
            </button>

            <button
              type="button"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-sm font-semibold text-ig-text">
                {formatLikeCount(
                  followerCount
                )}
              </span>

              <span className="text-xs text-ig-text">
                followers
              </span>
            </button>

            <button
              type="button"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-sm font-semibold text-ig-text">
                {formatLikeCount(
                  Number(
                    user.user
                      .followingCount ||
                      0
                  )
                )}
              </span>

              <span className="text-xs text-ig-text">
                following
              </span>
            </button>

          </div>

          {/* ==================================================
              REAL STORY HIGHLIGHTS
              
              This is the ONLY Highlights component.
              
              The old hard-coded:
              Travel / Food / Work / Family / New
              section has been removed.
          ================================================== */}

          {isOwnProfile && (
            <div className="w-full mb-6 md:mb-8">

              <StoryHighlights />

            </div>
          )}

          {/* ==================================================
              PROFILE TABS
          ================================================== */}

          <div className="border-t border-ig-border -mx-4">

            <div className="flex justify-center gap-8 md:gap-12">

              {tabs.map(
                ({
                  id,
                  icon: Icon,
                  label,
                }) => (

                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        id
                      )
                    }
                    className={`flex items-center gap-1.5 py-3 border-t -mt-px text-[11px] font-semibold uppercase tracking-widest transition-colors ${
                      activeTab === id
                        ? "border-ig-text text-ig-text"
                        : "border-transparent text-ig-muted hover:text-ig-text"
                    }`}
                  >

                    <Icon
                      size={13}
                      strokeWidth={
                        activeTab === id
                          ? 2.5
                          : 1.5
                      }
                    />

                    <span className="hidden sm:block">
                      {label}
                    </span>

                  </button>

                )
              )}

            </div>

          </div>

          {/* ==================================================
              POSTS TAB
          ================================================== */}

          {activeTab ===
            "posts" && (
            <>
              {posts.length ===
              0 ? (

                <div className="flex flex-col items-center py-20 gap-4">

                  <div className="w-16 h-16 rounded-full border-2 border-ig-text flex items-center justify-center">

                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-ig-text"
                    >

                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="5"
                      />

                      <circle
                        cx="12"
                        cy="12"
                        r="4"
                      />

                      <circle
                        cx="17.5"
                        cy="6.5"
                        r="1"
                        fill="currentColor"
                        stroke="none"
                      />

                    </svg>

                  </div>

                  <p className="text-2xl font-semibold text-ig-text">
                    No Posts Yet
                  </p>

                  {isOwnProfile && (
                    <p className="text-sm text-ig-muted">
                      Start capturing and sharing your moments.
                    </p>
                  )}

                </div>

              ) : (

                <div className="grid grid-cols-3 gap-0.75 -mx-4 mt-0.75">

                  {posts.map(
                    (post: any) => (

                      <button
                        key={
                          post._id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedPost(
                            post
                          )
                        }
                        className="relative aspect-square overflow-hidden group bg-ig-hover"
                      >

                        <img
                          src={
                            post.media?.[0]
                              ?.url ||
                            ""
                          }
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6">

                          <div className="flex items-center gap-1.5 text-white font-semibold">

                            <Heart
                              size={20}
                              className="fill-white text-white"
                            />

                            <span className="text-sm">
                              {formatLikeCount(
                                Number(
                                  post.likesCount ||
                                    0
                                )
                              )}
                            </span>

                          </div>

                          <div className="flex items-center gap-1.5 text-white font-semibold">

                            <MessageCircle
                              size={20}
                              className="fill-white text-white"
                            />

                            <span className="text-sm">
                              {Number(
                                post.commentsCount ||
                                  0
                              )}
                            </span>

                          </div>

                        </div>

                      </button>

                    )
                  )}

                </div>

              )}
            </>
          )}

          {/* ==================================================
              REELS / SAVED / TAGGED EMPTY STATES
          ================================================== */}

          {(
            [
              "reels",
              "saved",
              "tagged",
            ] as Tab[]
          ).includes(
            activeTab
          ) && (

            <div className="flex flex-col items-center py-20 gap-3">

              <div className="w-16 h-16 rounded-full border-2 border-ig-text flex items-center justify-center">

                {activeTab ===
                  "reels" && (
                  <Film
                    size={28}
                    strokeWidth={
                      1.5
                    }
                    className="text-ig-text"
                  />
                )}

                {activeTab ===
                  "saved" && (
                  <Bookmark
                    size={28}
                    strokeWidth={
                      1.5
                    }
                    className="text-ig-text"
                  />
                )}

                {activeTab ===
                  "tagged" && (
                  <Tag
                    size={28}
                    strokeWidth={
                      1.5
                    }
                    className="text-ig-text"
                  />
                )}

              </div>

              <p className="text-2xl font-semibold text-ig-text">

                {activeTab ===
                  "reels" &&
                  "No Reels Yet"}

                {activeTab ===
                  "saved" &&
                  "Save"}

                {activeTab ===
                  "tagged" &&
                  "Photos of You"}

              </p>

              <p className="text-sm text-ig-muted text-center max-w-55">

                {activeTab ===
                  "reels" &&
                  "Reels you share will appear here."}

                {activeTab ===
                  "saved" &&
                  "Save photos and videos that you want to see again."}

                {activeTab ===
                  "tagged" &&
                  "When people tag you in photos and videos, they'll appear here."}

              </p>

            </div>

          )}

        </div>

      </div>

      {/* ======================================================
          MOBILE NAVIGATION
      ====================================================== */}

      <MobileNav />

      {/* ======================================================
          POST MODAL
      ====================================================== */}

      {selectedPost && (
        <PostModal
          post={
            selectedPost
          }
          posts={posts}
          onClose={() =>
            setSelectedPost(
              null
            )
          }
        />
      )}

    </div>
  );
};

export default ProfileView;
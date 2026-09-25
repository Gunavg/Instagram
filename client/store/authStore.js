import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  loading: false,

  login: ({ user, token, refreshToken }) => {
    if (token) localStorage.setItem("accessToken", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, refreshToken: refreshToken || localStorage.getItem("refreshToken") });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    set({
      user: null,
      token: null,
      refreshToken: null,
    });
  },

  loadUser: () => {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const user = localStorage.getItem("user");

    if (token && user) {
      set({
        token,
        refreshToken,
        user: JSON.parse(user),
      });
    }
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;

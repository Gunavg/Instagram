import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000",

  withCredentials: true,
});

/*
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 *
 * Automatically attach the JWT access token to every
 * authenticated API request.
 */
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("accessToken");

      if (token) {
        config.headers = config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

/*
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 *
 * If the backend says that the token is invalid/expired,
 * remove the stale token and send the user to login.
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    if (
      typeof window !== "undefined" &&
      error?.response?.status === 401
    ) {
      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "user"
      );

      /*
       * Don't redirect repeatedly if
       * already on the login page.
       */
      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
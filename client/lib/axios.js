import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000",

  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    /*
     * Next.js can render code on the server.
     *
     * localStorage exists only in the browser.
     */
    if (
      typeof window !== "undefined"
    ) {
      const token =
        localStorage.getItem(
          "accessToken"
        );

      if (token) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

export default axiosInstance;
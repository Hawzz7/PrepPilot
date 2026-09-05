import axios from "axios";

const ServerURL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: ServerURL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const notifyRefreshSubscribers = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(axiosInstance(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      console.log("Access token expired. Refreshing...");

      await axios.post(
        `${ServerURL}/api/auth/refresh`,
        {},
        {
          withCredentials: true,
        },
      );

      console.log("Access token refreshed successfully.");

      isRefreshing = false;

      notifyRefreshSubscribers();

      return axiosInstance(originalRequest);
    } catch (refreshError) {
      console.error(
        "Refresh token failed:",
        refreshError.response?.data || refreshError.message,
      );

      isRefreshing = false;
      refreshSubscribers = [];

      return Promise.reject(refreshError);
    }
  },
);

export default axiosInstance;

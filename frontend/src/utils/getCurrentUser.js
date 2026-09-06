import axiosInstance from "../services/axiosInstance.js";
import { setUserData } from "../redux/userSlice";

const getCurrentUser = async (dispatch) => {
  try {
    const { data } = await axiosInstance.get("/api/user/current-user");

    dispatch(setUserData(data.user));

    return data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        await axiosInstance.post("/api/auth/refresh", {});

        const { data } = await axiosInstance.get(
          "/api/user/current-user",
        );

        dispatch(setUserData(data.user));

        return data.user;
      } catch (refreshError) {
        console.log("Session expired. Please login again.");

        dispatch(setUserData(null));

        return null;
      }
    }

    console.error(error);
    dispatch(setUserData(null));

    return null;
  }
};

export default getCurrentUser;
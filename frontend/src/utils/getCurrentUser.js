import axios from "axios";
import { setUserData } from "../redux/userSlice";
import { ServerURL } from "../App";

const getCurrentUser = async (dispatch) => {
  try {
    // Get current user
    const { data } = await axios.get(`${ServerURL}/api/user/current-user`, {
      withCredentials: true,
    });

    dispatch(setUserData(data.user));

    return data.user;
  } catch (error) {

    // Access token expired
    if (error.response?.status === 401) {
      try {
        // Generate a new access token
        await axios.post(
          `${ServerURL}/api/auth/refresh`,
          {},
          {
            withCredentials: true,
          },
        );

        // Try again with the new access token
        const { data } = await axios.get(`${ServerURL}/api/user/current-user`, {
          withCredentials: true,
        });

        dispatch(setUserData(data.user));

        return data.user;
      } catch (error) {
        console.log("Session expired. Please login again.");

        dispatch(setUserData(null));

        return null;
      }
    } else {
      console.error(error);

      dispatch(setUserData(null));

      return null;
    }
  }
};

export default getCurrentUser;

import { BsRobot } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase.js";
import axios from "axios";
import { ServerURL } from "../App.jsx";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import getCurrentUser from "../utils/getCurrentUser.js";

const Auth = ({ isModal = false }) => {

const navigate = useNavigate();
const dispatch = useDispatch();

  const handleGoogleAuth = async () => {
    try {
      const response = await signInWithPopup(auth, provider);
      let {displayName: name, email} = response.user

      const result = await axios.post(
        `${ServerURL}/api/auth/google`,
        { name, email },
        { withCredentials: true },
      );

      await getCurrentUser(dispatch);

      console.log(result.data);
      navigate("/");
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div
      className={`w-full ${isModal ? "py-4" : "min-h-screen bg-[#f3f3f3] flex items-center justify-center px-6 py-20"}`}
    >
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full ${isModal ? "max-w-md p-8 rounded-3xl" : "max-w-lg p-12 rounded-4xl"} bg-white shadow-2xl border border-gray-200`}
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          {/* logo */}
          <div className="bg-black text-white p-2 rounded-lg">
            <BsRobot size={18} />
          </div>
          {/* Heading */}
          <h2 className="font-semibold text-lg">PrepPilot</h2>
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-center leading-snug mb-5">
          Continue Your{" "}
          <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full inline-flex items-center gap-2">
            <IoSparkles size={16} />
            AI Interview Journey
          </span>
        </h1>

        {/*  */}
        <p className="text-gray-500 text-center text-sm md:text-base leading-relaxed mb-8">
          Sign in to practice AI-powered mock interviews, receive instant
          feedback, and track your interview progress.
        </p>

        <motion.button
          onClick={handleGoogleAuth}
          whileHover={{ opacity: 0.9, scale: 1.03 }}
          whileTap={{ opacity: 1, scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3 p-3 bg-black text-white rounded-full shadow-md"
        >
          <FcGoogle size={20} />
          Continue with Google
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Auth;

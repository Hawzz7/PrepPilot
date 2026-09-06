import { useDispatch, useSelector } from "react-redux";
import { motion } from "motion/react";
import { BsRobot, BsCoin } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import { FaUserAstronaut } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance.js";
import { setUserData } from "../redux/userSlice";
import AuthModal from "./AuthModal";

const Navbar = () => {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const creditPopupRef = useRef(null);
  const userPopupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        creditPopupRef.current &&
        !creditPopupRef.current.contains(event.target)
      ) {
        setShowCreditPopup(false);
      }

      if (
        userPopupRef.current &&
        !userPopupRef.current.contains(event.target)
      ) {
        setShowUserPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      setShowUserPopup(false);
      setShowCreditPopup(false);
      dispatch(setUserData(null));
    } catch (error) {
      console.error(error);

      setShowUserPopup(false);
      setShowCreditPopup(false);
    }
  };

  return (
    <div className="bg-[#f3f3f3] flex justify-center px-4 pt-6">
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl bg-white rounded-[24px] shadow-sm border border-gray-200 px-8 py-4 flex justify-between items-center relative"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="bg-black text-white p-2 rounded-lg">
            <BsRobot size={18} />
          </div>
          <h1 className="font-semibold hidden md:block text-lg">PrepPilot</h1>
        </div>

        <div className="flex items-center gap-6 relative">
          {/* Credits */}
          <div className="relative" ref={creditPopupRef}>
            <button
              onClick={() => {
                if (!userData) {
                  setShowAuth(true);
                  return;
                }
                setShowUserPopup(false);
                setShowCreditPopup((prev) => !prev);
              }}
              className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-shadow-md hover:bg-gray-200 transition"
            >
              <BsCoin size={20} />
              {userData?.credits || 0}
            </button>
            {showCreditPopup && (
              <div className="absolute right-[-50px] mt-3 w-64 bg-white shadow-xl border border-gray-200 rounded-xl p-5 z-50">
                <p className="text-sm text-gray-600 mb-4">
                  Need more credits to continue interviews!
                </p>
                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full bg-black text-white py-2 rounded-lg text-sm"
                >
                  Buy more credits
                </button>
              </div>
            )}
          </div>

          {/* User */}

          <div className="relative" ref={userPopupRef}>
            <button
              onClick={() => {
                if (!userData) {
                  setShowAuth(true);
                  return;
                }
                setShowCreditPopup(false);
                setShowUserPopup((prev) => !prev);
              }}
              className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-semibold"
            >
              {userData ? (
                userData?.name.charAt(0).toUpperCase()
              ) : (
                <FaUserAstronaut size={16} />
              )}
            </button>
            {showUserPopup && (
              <div className="absolute right-0 mt-3 w-48 bg-white shadow-xl border border-gray-200 rounded-xl p-4 z-50">
                <p className="text-base text-blue-500 font-medium mb-1">
                  {userData?.name}
                </p>
                <button
                  onClick={() => navigate("/history")}
                  className="w-full text-left text-sm py-2 hover:text-black text-gray-600"
                >
                  Interview History
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-sm py-2 flex items-center gap-2 text-red-500"
                >
                  <HiOutlineLogout size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Navbar;

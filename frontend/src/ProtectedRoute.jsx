import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("authToken");

  if (!token) {
    toast.error("You are not logged in! Redirecting...", { autoClose: 2000 }); // 2-sec alert
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

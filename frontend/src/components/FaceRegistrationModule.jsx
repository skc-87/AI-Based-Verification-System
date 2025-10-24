import { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const FaceRegistrationModule = ({ token, apiUrl }) => {
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    image: "",
    imageFile: null,
  });

  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Unable to capture image");
      return;
    }

    const blob = dataURLtoBlob(imageSrc);
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

    setFormData({ 
      ...formData, 
      image: imageSrc,
      imageFile: file
    });
    
    setShowCamera(false); // <-- FIX IS HERE
    
    toast.success("Image captured successfully");
  };

  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({
        ...formData,
        image: event.target.result,
        imageFile: file
      });
      toast.success("Image selected successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!formData.studentId || !formData.studentName || !formData.imageFile) {
      toast.error("Please provide all fields and capture/upload a face image.");
      return;
    }

    try {
      setIsLoading(true);
      
      const payload = {
        student_id: formData.studentId,
        name: formData.studentName,
        image: formData.image
      };

      const response = await axios.post(
        `${apiUrl}/register-face`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.success) {
        setRegistrationStatus({
          studentId: formData.studentId,
          name: formData.studentName,
          status: "Registered",
        });
        toast.success(response.data.message || "Student registered successfully!");
        setFormData({ studentId: "", studentName: "", image: "", imageFile: null });
        setShowCamera(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8 p-8 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-lg border border-blue-100"
    >
      <motion.h2 
        whileHover={{ scale: 1.02 }}
        className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"
      >
        Student Face Registration
      </motion.h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Form fields */}
        <div className="space-y-6">
          <motion.div whileHover={{ scale: 1.01 }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID *
            </label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) =>
                setFormData({ ...formData, studentId: e.target.value })
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
              placeholder="Enter student ID"
              required
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) =>
                setFormData({ ...formData, studentName: e.target.value })
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
              placeholder="Enter student's full name"
              required
            />
          </motion.div>

          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Face Image *
            </label>
            <div className="flex flex-col space-y-4">
              <motion.button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={!formData.studentId || !formData.studentName}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={`px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                  !formData.studentId || !formData.studentName
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                Use Camera
              </motion.button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-500">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                id="file-upload"
              />
              <motion.label
                htmlFor="file-upload"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 bg-white border-2 border-dashed border-blue-400 rounded-lg text-center cursor-pointer font-medium text-blue-600 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Upload Image
              </motion.label>
            </div>
          </div>
        </div>

        {/* Image preview/capture area */}
        <div className="flex flex-col items-center">
          {showCamera ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-md space-y-4"
            >
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="rounded-xl border-2 border-blue-200 shadow-lg w-full"
              />
              <div className="flex space-x-4">
                <motion.button
                  onClick={captureImage}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  Capture
                </motion.button>
                <motion.button
                  onClick={() => setShowCamera(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          ) : formData.image ? (
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-full max-w-md space-y-4"
            >
              <div className="border-2 border-blue-200 rounded-xl p-1 shadow-inner">
                <img
                  src={formData.image}
                  alt="Captured"
                  className="w-full rounded-lg"
                />
              </div>
              <motion.button
                onClick={() => setFormData({ ...formData, image: "", imageFile: null })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
              >
                Remove Image
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="w-full max-w-md h-64 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 shadow-inner"
            >
              <div className="text-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No image selected</p>
                <p className="text-xs mt-1 text-gray-400">Capture or upload an image</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <motion.button
          onClick={handleRegister}
          disabled={
            isLoading ||
            !formData.studentId ||
            !formData.studentName ||
            !formData.imageFile
          }
          whileHover={{ 
            scale: !isLoading &&
              formData.studentId &&
              formData.studentName &&
              formData.imageFile ? 1.05 : 1 
          }}
          whileTap={{ scale: 0.98 }}
          className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-300 ${
            isLoading ||
            !formData.studentId ||
            !formData.studentName ||
            !formData.imageFile
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg hover:shadow-xl"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering...
            </span>
          ) : (
            "Register Student"
          )}
        </motion.button>
      </div>

      {registrationStatus && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 shadow-sm"
        >
          <h3 className="text-xl font-semibold text-green-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Registration Successful
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="flex items-center">
              <span className="text-gray-600 mr-2">Student ID:</span>
              <span className="font-medium text-blue-700">{registrationStatus.studentId}</span>
            </p>
            <p className="flex items-center">
              <span className="text-gray-600 mr-2">Name:</span>
              <span className="font-medium text-blue-700">{registrationStatus.name}</span>
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FaceRegistrationModule;
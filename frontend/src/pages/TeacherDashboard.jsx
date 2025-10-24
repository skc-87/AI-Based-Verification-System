import { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FileUploadForm from "../components/FileUploadForm";
import HandwritingSamplesTable from "../components/HandwritingSamplesTable";
import AssignmentsTable from "../components/AssignmentsTable";
import FaceRegistrationModule from "../components/FaceRegistrationModule";
import ClassAttendanceModule from "../components/ClassAttendanceModule";
import EventManager from "../components/EventManager";

// Icon components for tabs
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const UserAddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>;
const CollectionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>;
const EventIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;

const TeacherDashboard = () => {
  const API_BASE_URL = "http://localhost:5000/api/files";
  const FACE_API_URL = "http://localhost:5000/api/model";
  const EVENT_API_URL = "http://localhost:5000/api";
  
  const [handwritingSamples, setHandwritingSamples] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");

  const token = sessionStorage.getItem("authToken");

  const handleEvaluate = async (fileId, marks) => {
    try {
      await axios.put(
        `${API_BASE_URL}/evaluate/${fileId}`,
        { marks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Marks saved successfully!");
      fetchFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Oops! Something went wrong.");
    }
  };

  const handleUpload = async ({ studentId, studentName, file }) => {
    if ((!studentId && !studentName) || !file) {
      toast.error("Please provide student info and select a file.");
      return;
    }
    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("file", file);
    formData.append("fileCategory", "handwriting_sample");
    formData.append("studentName", studentName);
    setIsUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/upload/teacher`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("File uploaded successfully!");
      fetchFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/all-files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHandwritingSamples(res.data.handwritingSamples || []);
      setAssignments(res.data.assignments || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching files.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [token]);

  const TabButton = ({ tabName, activeTab, setActiveTab, children }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center px-4 py-3 font-medium text-sm transition-all duration-300 rounded-t-lg border-b-2
        ${activeTab === tabName
          ? 'text-blue-600 border-blue-600 bg-white'
          : 'text-gray-500 border-transparent hover:text-blue-600 hover:border-blue-300'
        }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-center">
            Teacher Dashboard
          </h1>
          <p className="text-center text-gray-500 mt-2">Manage attendance, registrations, events, and student records efficiently.</p>
        </header>

        {/* --- Tab Navigation --- */}
        <div className="border-b border-gray-200 bg-gray-100 rounded-t-xl p-2 flex space-x-2 overflow-x-auto">
          <TabButton tabName="attendance" activeTab={activeTab} setActiveTab={setActiveTab}>
            <CalendarIcon /> Attendance
          </TabButton>
          <TabButton tabName="registration" activeTab={activeTab} setActiveTab={setActiveTab}>
            <UserAddIcon /> Registration & Uploads
          </TabButton>
          <TabButton tabName="events" activeTab={activeTab} setActiveTab={setActiveTab}>
            <EventIcon /> Events & Passes
          </TabButton>
          <TabButton tabName="records" activeTab={activeTab} setActiveTab={setActiveTab}>
            <CollectionIcon /> Student Records
          </TabButton>
        </div>

        {/* --- Main Content Area --- */}
        <main className="bg-white rounded-b-xl shadow-lg border border-gray-200 p-6">
          {activeTab === 'attendance' && (
            <ClassAttendanceModule token={token} apiUrl={FACE_API_URL} />
          )}

          {activeTab === 'registration' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Student & Sample Management</h2>
              {/* --- Grid Layout for Forms --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <FaceRegistrationModule token={token} apiUrl={FACE_API_URL} />
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <FileUploadForm onUpload={handleUpload} isLoading={isUploading} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Event Management</h2>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <EventManager token={token} apiUrl={EVENT_API_URL} />
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Records & Assignments</h2>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-sm"
                />
              </div>
              <div className="space-y-8">
                <AssignmentsTable
                  data={assignments}
                  isLoading={isLoading}
                  API_BASE_URL={API_BASE_URL}
                  searchTerm={searchTerm}
                  handleEvaluate={handleEvaluate}
                />
                <HandwritingSamplesTable
                  data={handwritingSamples}
                  isLoading={isLoading}
                  API_BASE_URL={API_BASE_URL}
                  searchTerm={searchTerm}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

export default TeacherDashboard;
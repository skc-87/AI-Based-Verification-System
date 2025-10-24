import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Webcam from "react-webcam";

const ClassAttendanceModule = ({ token, apiUrl }) => {
  // Helper function to get current local date in YYYY-MM-DD format
  const getCurrentLocalDate = () => {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return localDate.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    subject: "",
    date: getCurrentLocalDate(),
    image: "",
  });

  // --- FIX 1: Use two separate state variables for records ---
  const [currentRecords, setCurrentRecords] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [activeTab, setActiveTab] = useState("current");
  const [editingStatus, setEditingStatus] = useState({});
  const [statistics, setStatistics] = useState(null);
  const webcamRef = useRef(null);

  // This effect runs ONLY when the 'current' tab is active and the date or subject changes.
  useEffect(() => {
    if (activeTab === "current") {
      fetchAttendanceRecords();
      fetchAttendanceStatistics();
    }
  }, [activeTab, formData.date, formData.subject]);

  // This effect runs ONLY ONCE when switching to the 'history' tab.
  useEffect(() => {
    if (activeTab === "history") {
      fetchAllAttendanceRecords();
    }
  }, [activeTab]);

  // --- FIX 2: This function now updates 'currentRecords' state ---
  const fetchAttendanceRecords = async () => {
    try {
      setIsLoadingRecords(true);
      const response = await axios.get(
        `${apiUrl}/get-attendance?date=${formData.date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.success) {
        setCurrentRecords(response.data.records || []);
        setEditingStatus({});
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance records");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // --- FIX 3: This function now updates 'historyRecords' state ---
  const fetchAllAttendanceRecords = async () => {
    try {
      setIsLoadingRecords(true);
      const response = await axios.get(`${apiUrl}/get-all-attendance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        setHistoryRecords(response.data.records || []);
        setEditingStatus({});
      }
    } catch (error) {
      console.error("Error fetching all attendance:", error);
      toast.error("Failed to load attendance history");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const fetchAttendanceStatistics = async () => {
    try {
      setIsLoadingStats(true);
      const url = formData.subject
        ? `${apiUrl}/attendance-statistics?date=${formData.date}&subject=${formData.subject}`
        : `${apiUrl}/attendance-statistics?date=${formData.date}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error("Failed to load attendance statistics");
    } finally {
      setIsLoadingStats(false);
    }
  };

  // --- FIX 4: Update the correct state list based on the active tab ---
  const toggleAttendanceStatus = async (record, newStatus) => {
    if (!record._id) {
      toast.error("Cannot update record: Missing record ID");
      return;
    }
    try {
      setEditingStatus((prev) => ({ ...prev, [record._id]: true }));
      const response = await axios.put(
        `${apiUrl}/update-attendance-status`,
        {
          recordId: record._id,
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        if (activeTab === "current") {
          const updatedRecords = currentRecords.map((r) =>
            r._id === record._id ? { ...r, status: newStatus } : r
          );
          setCurrentRecords(updatedRecords);
        } else {
          const updatedRecords = historyRecords.map((r) =>
            r._id === record._id ? { ...r, status: newStatus } : r
          );
          setHistoryRecords(updatedRecords);
        }
        fetchAttendanceStatistics(); // Refresh stats in both cases
        toast.success(`Status updated to ${newStatus}`);
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating attendance status:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setEditingStatus((prev) => ({ ...prev, [record._id]: false }));
    }
  };

  const handleStatusToggle = (record) => {
    const newStatus = record.status === "Present" ? "Absent" : "Present";
    toggleAttendanceStatus(record, newStatus);
  };

  // --- FIX 5: This function now groups the 'historyRecords' ---
  const groupRecordsByDate = () => {
    const grouped = {};
    historyRecords.forEach((record) => {
      const date = record.date;
      if (!date) return;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  const getFilteredRecords = () => {
    const grouped = groupRecordsByDate();
    if (searchDate) {
      return { [searchDate]: grouped[searchDate] || [] };
    }
    return grouped;
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Unable to capture image");
      return;
    }
    setFormData({ ...formData, image: imageSrc });
    setShowCamera(false);
    toast.success("Image captured successfully");
  };

  const handleTakeAttendance = async () => {
    if (!formData.subject) {
      toast.error("Please select a subject");
      return;
    }
    if (!formData.image) {
      toast.error("Please capture an image for attendance");
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        subject: formData.subject.trim(),
        image: formData.image,
        date: formData.date,
      };
      const response = await axios.post(`${apiUrl}/take-attendance`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.data.success) {
        await fetchAttendanceRecords();
        await fetchAttendanceStatistics();
        toast.success(
          response.data.message || `Attendance recorded successfully`
        );
      } else {
        toast.error(response.data.message || "Attendance recording failed");
      }
    } catch (error) {
      console.error("Attendance error:", error);
      toast.error(
        error.response?.data?.message || "Failed to record attendance."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatistics = () => (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Attendance Statistics
      </h3>
      {isLoadingStats ? (
        <div className="text-center py-4">Loading statistics...</div>
      ) : statistics ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {statistics.present}
              </div>
              <div className="text-sm text-gray-600">Present</div>
              <div className="text-xs text-green-500">
                {statistics.presentPercentage}%
              </div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {statistics.absent}
              </div>
              <div className="text-sm text-gray-600">Absent</div>
              <div className="text-xs text-red-500">
                {statistics.absentPercentage}%
              </div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {statistics.total}
              </div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
          </div>
          {statistics.bySubject && Object.keys(statistics.bySubject).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-3 text-gray-700">
                Statistics by Subject
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(statistics.bySubject).map(([subject, stats]) => (
                  <div key={subject} className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">{subject}</span>
                      <span className="text-sm text-gray-600">
                        {stats.total} total
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">
                        {stats.present} present ({stats.presentPercentage}%)
                      </span>
                      <span className="text-red-600">
                        {stats.absent} absent ({stats.absentPercentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No statistics available for selected date
        </div>
      )}
    </div>
  );
  
  // --- FIX 6: This function now maps over 'currentRecords' ---
  const renderCurrentDateTable = () => (
    <div className="overflow-x-auto shadow-sm rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentRecords.map((record) => (
            <tr key={record._id} className={`hover:bg-gray-50 ${record.status === 'Absent' ? 'bg-red-50' : ''}`}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.student_id || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.name || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.time || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.subject || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => handleStatusToggle(record)}
                  disabled={editingStatus[record._id]}
                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-200 ${
                    record.status === "Present"
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  } ${editingStatus[record._id] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                >
                  {editingStatus[record._id] ? 'Updating...' : record.status || 'N/A'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // This function now correctly uses getFilteredRecords, which reads from the separate historyRecords state
  const renderHistoryTables = () => {
    const groupedRecords = getFilteredRecords();
    return (
      <div className="space-y-6">
        {Object.entries(groupedRecords).map(([date, records]) => (
          <div key={date} className="border rounded-lg overflow-hidden shadow-sm">
            <h4 className="bg-gray-50 px-4 py-3 border-b font-medium text-gray-800">
              {new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record._id} className={`hover:bg-gray-50 ${record.status === "Absent" ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{record.student_id || "N/A"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{record.name || "N/A"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{record.time || "N/A"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{record.subject || "N/A"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(record)}
                          disabled={editingStatus[record._id]}
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-200 ${
                            record.status === "Present"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          } ${editingStatus[record._id] ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}`}
                        >
                          {editingStatus[record._id] ? "Updating..." : record.status || "N/A"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-8 p-6 rounded-lg bg-white shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Class Attendance
      </h2>
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "current"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("current")}
        >
          Today's Attendance
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "history"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Attendance History
        </button>
      </div>

      {activeTab === "current" && (
        <>
          {!showCamera && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label
                  htmlFor="subject-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Subject *
                </label>
                <select
                  id="subject-select"
                  name="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="attendance-date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date
                </label>
                <input
                  id="attendance-date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  max={getCurrentLocalDate()}
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Face Capture *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className={`px-4 py-2 rounded-md ${
                    !formData.subject || isLoading
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  disabled={!formData.subject || isLoading}
                >
                  {formData.image ? "Recapture Image" : "Capture Face"}
                </button>
              </div>
            </div>
          )}
          {showCamera && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="w-full max-w-md mx-auto space-y-3">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="rounded-md w-full"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={captureImage}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {formData.image && !showCamera && (
            <div className="mb-6 flex flex-col items-center">
              <div className="w-full max-w-md border rounded-md p-1 mb-3">
                <img
                  src={formData.image}
                  alt="Captured for attendance"
                  className="w-full rounded-md"
                />
              </div>
              <button
                onClick={() => setFormData({ ...formData, image: "" })}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={isLoading}
              >
                Remove Image
              </button>
            </div>
          )}
          <div className="flex justify-end mb-6">
            <button
              onClick={handleTakeAttendance}
              disabled={isLoading || !formData.subject || !formData.image}
              className={`px-6 py-2 rounded-md ${
                isLoading || !formData.subject || !formData.image
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isLoading ? "Processing..." : "Take Attendance"}
            </button>
          </div>
          {renderStatistics()}
        </>
      )}

      {activeTab === "history" && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label
                htmlFor="search-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter by Date
              </label>
              <input
                id="search-date"
                name="searchDate"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                max={getCurrentLocalDate()}
              />
            </div>
            <button
              onClick={() => setSearchDate("")}
              className="mt-2 md:mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {activeTab === "current"
              ? `Attendance for ${formData.date}`
              : "Attendance History"}
          </h3>
          <button
            onClick={
              activeTab === "current"
                ? fetchAttendanceRecords
                : fetchAllAttendanceRecords
            }
            disabled={isLoadingRecords}
            className={`px-3 py-1 rounded-md text-sm ${
              isLoadingRecords
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            }`}
          >
            Refresh
          </button>
        </div>
        {/* --- FIX 7: Update the final render logic --- */}
        {isLoadingRecords ? (
          <div className="text-center py-8">Loading...</div>
        ) : activeTab === "current" ? (
          currentRecords.length > 0 ? (
            renderCurrentDateTable()
          ) : (
            <div className="text-center py-8 text-gray-500">
              No attendance records found.
            </div>
          )
        ) : historyRecords.length > 0 ? (
          renderHistoryTables()
        ) : (
          <div className="text-center py-8 text-gray-500">
            No attendance history found.
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassAttendanceModule;
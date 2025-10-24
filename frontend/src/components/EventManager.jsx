import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";

const EventManager = ({ token, apiUrl }) => {
  const [activeTab, setActiveTab] = useState("create");
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    organizer: ""
  });

  useEffect(() => {
    fetchEvents();
    fetchStudents();
  }, [token]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${apiUrl}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data.events || []);
    } catch (error) {
      toast.error("Failed to fetch events");
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${apiUrl}/events/students/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students || []);
    } catch (error) {
      toast.error("Failed to fetch students");
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${apiUrl}/events/create`,
        eventForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Event created successfully!");
      setEvents([response.data.event, ...events]);
      setEventForm({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        organizer: ""
      });
    } catch (error) {
      toast.error("Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

 const handleGeneratePasses = async () => {
  if (!selectedEvent || selectedStudents.length === 0) {
    toast.error("Please select an event and at least one student");
    return;
  }

  setIsLoading(true);
  try {
    const response = await axios.post(
      `${apiUrl}/events/${selectedEvent}/generate-passes`,
      { studentIds: selectedStudents },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        response.data.errors.forEach(error => toast.warning(error));
      }
      setSelectedStudents([]);
    } else {
      toast.error(response.data.message || "Failed to generate passes");
    }
  } catch (error) {
    console.error("Generate passes error:", error);
    if (error.response?.status === 404) {
      toast.error("Event not found. Please create the event first.");
    } else {
      toast.error(error.response?.data?.message || "Failed to generate passes");
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleQRScan = async (qrData) => {
    try {
      const response = await axios.post(
        `${apiUrl}/events/validate-qr`,
        { qrData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setScannerResult(response.data);
      if (response.data.valid) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to validate QR code");
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(student => student._id));
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  // Generate QR data for display (lightweight version)
  const generateEventQRData = (event) => {
    return JSON.stringify({
      eventId: event.eventId,
      type: "event_info",
      title: event.title,
      date: event.date,
      time: event.time
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Event Management</h2>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "create"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Create Event
        </button>
        <button
          onClick={() => setActiveTab("passes")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "passes"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Generate Passes
        </button>
        <button
          onClick={() => setActiveTab("scanner")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "scanner"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          QR Scanner
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "events"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Events
        </button>
      </div>

      {/* Create Event Tab */}
      {activeTab === "create" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Create New Event</h3>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter event title"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Event description"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Event venue"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organizer *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.organizer}
                  onChange={(e) => setEventForm({ ...eventForm, organizer: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Organizer name"
                  maxLength={50}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? "Creating Event..." : "Create Event & Generate QR"}
            </button>
          </form>
        </div>
      )}

      {/* Generate Passes Tab */}
      {activeTab === "passes" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Generate Event Passes</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event
            </label>
            <select
              value={selectedEvent || ""}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose an event</option>
              {events.map(event => (
                <option key={event._id} value={event.eventId}>
                  {event.title} - {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Students ({selectedStudents.length} selected)
              </label>
              <div className="space-x-2">
                <button
                  onClick={selectAllStudents}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
              {students.map(student => (
                <div key={student._id} className="flex items-center p-3 border-b border-gray-200 last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student._id)}
                    onChange={() => toggleStudentSelection(student._id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {student.name} ({student.email})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGeneratePasses}
            disabled={!selectedEvent || selectedStudents.length === 0 || isLoading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "Generating Passes..." : `Generate ${selectedStudents.length} Passes`}
          </button>
        </div>
      )}

      {/* QR Scanner Tab */}
      {activeTab === "scanner" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">QR Code Scanner</h3>
          
          <div className="bg-gray-100 p-6 rounded-lg mb-4">
            <p className="text-gray-600 mb-4">
              For demonstration purposes. In a real app, you would use a camera scanner.
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Paste QR code data here to validate..."
                onChange={(e) => handleQRScan(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <button
                onClick={() => {
                  // Simulate scanning a valid QR code
                  const sampleData = JSON.stringify({
                    type: "event_pass",
                    eventId: "EVT123",
                    passId: "PASS456",
                    studentId: "student123",
                    studentName: "John Doe"
                  });
                  handleQRScan(sampleData);
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Test with Sample QR
              </button>
            </div>
          </div>

          {scannerResult && (
            <div className={`p-4 rounded-lg ${
              scannerResult.valid ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
            }`}>
              <h4 className={`font-semibold ${
                scannerResult.valid ? 'text-green-800' : 'text-red-800'
              }`}>
                {scannerResult.valid ? '✓ Valid QR Code' : '✗ Invalid QR Code'}
              </h4>
              <p className={`mt-2 ${scannerResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                {scannerResult.message}
              </p>
              {scannerResult.data && (
                <div className="mt-3 text-sm">
                  <pre className="bg-white p-3 rounded border">
                    {JSON.stringify(scannerResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Events Tab */}
      {activeTab === "events" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">My Events</h3>
          
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No events created yet.</p>
          ) : (
            <div className="space-y-4">
              {events.map(event => (
                <div key={event._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-800">{event.title}</h4>
                      <p className="text-gray-600 mt-1">{event.description}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <p>📅 {new Date(event.date).toLocaleDateString()} at {event.time}</p>
                        <p>📍 {event.venue}</p>
                        <p>👤 Organized by: {event.organizer}</p>
                        <p>🆔 Event ID: {event.eventId}</p>
                      </div>
                    </div>
                    <div className="text-center ml-4">
                      <QRCodeSVG 
                        value={generateEventQRData(event)}
                        size={80}
                        level="M" // Error correction level: L, M, Q, H
                        className="border border-gray-300 rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">Event QR</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedEvent(event.eventId);
                        setActiveTab("passes");
                      }}
                      className="text-sm bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
                    >
                      Manage Passes
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(generateEventQRData(event))}
                      className="text-sm bg-gray-600 text-white py-1 px-3 rounded hover:bg-gray-700"
                    >
                      Copy QR Data
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventManager;
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import axios from "axios";
import CompareHandwriting from "../components/CompareHandwriting";

const UploadFile = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [studentId, setStudentId] = useState("");
    const [assignments, setAssignments] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const userName = sessionStorage.getItem("userName");
    const [isReadyForComparison, setIsReadyForComparison] = useState(false);

    const onComparisonFailed = () => {
        toast.info("The failed assignment file has been removed. Please upload a new one.");
        setIsReadyForComparison(false);
        fetchAssignments();
    };

    const fetchAssignments = async () => {
        if (!studentId) return;
        setIsFetching(true);
        try {
            const token = sessionStorage.getItem("authToken");
            const response = await axios.get(
                `http://localhost:5000/api/files/student-assignments/${studentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAssignments(response.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch assignments");
        } finally {
            setIsFetching(false);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file before uploading.");
            return;
        }
        const token = sessionStorage.getItem("authToken");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileCategory", "assignment");
        formData.append("studentName", userName);

        setLoading(true);
        toast.info("Uploading your assignment...", { autoClose: 2000 });

        try {
            await axios.post(
                `http://localhost:5000/api/files/upload`,
                formData,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
            );
            toast.dismiss();
            toast.success("Assignment uploaded successfully! Ready for verification.");
            setFile(null);
            setIsReadyForComparison(true);
            fetchAssignments();
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.message || "Upload failed!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userData = sessionStorage.getItem("user");
        if (userData && userData !== "undefined") {
            try {
                const parsed = JSON.parse(userData);
                if (parsed?._id) setStudentId(parsed._id);
            } catch (e) { console.error("Invalid user data in session storage:", e); }
        }
    }, []);

    useEffect(() => {
        if (studentId) {
            fetchAssignments();
        }
    }, [studentId]);

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* --- Header Section --- */}
                <header className="text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        Student Dashboard
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">Welcome, {userName}!</p>
                </header>

                {/* --- Main 2-Step Submission & Verification Module --- */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Assignment Submission & Verification</h2>

                    {/* --- Step 1: Upload Assignment --- */}
                    <div className="mb-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                            <h3 className="text-xl font-semibold text-gray-700">Upload Your File</h3>
                        </div>
                        <div className="flex items-center justify-center w-full mb-4">
                            <label className="flex flex-col w-full h-32 border-2 border-gray-300 border-dashed hover:bg-gray-100 hover:border-gray-400 transition-all rounded-lg cursor-pointer">
                                <div className="flex flex-col items-center justify-center pt-7">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className="pt-1 text-sm text-center text-gray-600 px-2 truncate">{file ? file.name : "Click to browse or drag & drop"}</p>
                                </div>
                                <input type="file" onChange={(e) => {if (e.target.files[0]) setFile(e.target.files[0]);}} className="opacity-0" />
                            </label>
                        </div>
                        <button
                            onClick={handleUpload}
                            className={`w-full py-3 text-white font-semibold rounded-lg flex justify-center items-center gap-2 transition-all duration-300 ${loading || !file ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"}`}
                            disabled={loading || !file}
                        >
                            {loading ? "Uploading..." : "Upload Assignment"}
                        </button>
                    </div>

                    {/* --- Divider --- */}
                    <hr className="my-8 border-gray-200" />

                    {/* --- Step 2: Verify Handwriting (Conditionally Styled) --- */}
                    <div className={`transition-all duration-500 ${isReadyForComparison ? "opacity-100" : "opacity-50"}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors duration-500 ${isReadyForComparison ? 'bg-green-600' : 'bg-gray-400'}`}>2</div>
                            <h3 className="text-xl font-semibold text-gray-700">Verify Handwriting</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 ml-12">
                            After uploading an assignment, you can verify your handwriting against the sample you provided.
                        </p>
                        <div className="ml-12">
                            {studentId && (
                                <CompareHandwriting
                                    studentId={studentId}
                                    isReadyForComparison={isReadyForComparison}
                                    onComparisonFailed={onComparisonFailed}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Assignments History Table --- */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-gray-800">Submission History</h3>
                        <button onClick={fetchAssignments} className="text-sm font-medium text-blue-600 hover:underline" disabled={isFetching}>Refresh</button>
                    </div>
                    {isFetching ? (
                        <div className="text-center p-8 text-gray-500">Loading assignments...</div>
                    ) : assignments.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {assignments.map((assignment) => (
                                        <tr key={assignment._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{assignment.fileName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(assignment.uploadDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                {assignment.marks ? (<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Graded</span>) : (<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-700">{assignment.marks || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <h4 className="text-lg font-medium text-gray-700">No assignments submitted yet</h4>
                            <p className="mt-1 text-gray-500">Upload your first assignment to see it here.</p>
                        </div>
                    )}
                </div>

                <ToastContainer position="bottom-right" autoClose={4000} theme="colored" />
            </div>
        </div>
    );
};

export default UploadFile;
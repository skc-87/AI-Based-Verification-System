import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const CompareHandwriting = ({ studentId, isReadyForComparison, onComparisonFailed }) => {
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [randomFact, setRandomFact] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState(0);

  const funFacts = [
    "Handwriting can reveal over 5,000 personality traits!",
    "No two people write the same – even identical twins.",
    "Leonardo da Vinci wrote in mirror writing.",
    "The word 'graphology' comes from Greek: 'graph' = write, 'ology' = study.",
    "Your brain makes over 1000 decisions per second when you write!",
    "Writing by hand activates more regions of the brain than typing.",
    "Cursive writing improves fine motor skills and brain development.",
    "Some schools in the world still teach calligraphy as a subject.",
    "In the digital age, handwritten notes are shown to improve memory retention.",
    "The loops and slants in your handwriting may reflect your mood and confidence.",
  ];

  // Progress simulation
  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        // --- FIX IS HERE ---
        setProgress((prev) => {
          // Calculate the potential new value first
          const newValue = prev + Math.floor(Math.random() * 10) + 5;
          // Return the smaller of the two: the new value or 95.
          // This ensures it never goes past 95.
          return Math.min(newValue, 95);
        });
      }, 800);
      return () => clearInterval(timer);
    } else {
      // Reset to 0 when not loading
      setProgress(0);
    }
  }, [loading]);

  // Compare API call
  const handleCompare = async () => {
    const token = sessionStorage.getItem("authToken");
    if (!token) {
      toast.error("User not authenticated. Please log in.");
      return;
    }

    setLoading(true);
    setComparisonResult(null);
    setError(null);
    setRandomFact(funFacts[Math.floor(Math.random() * funFacts.length)]);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/model/compare-handwriting/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.status === "success") {
        setComparisonResult(response.data);
        setProgress(100);
        toast.success("Analysis complete!");
      } else {
        throw new Error(response.data.message || "Comparison failed with an unknown error.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Server error while comparing handwriting.";
      setError(errorMessage);
      toast.error(`Analysis Failed: ${errorMessage}`);

      if (onComparisonFailed) onComparisonFailed();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          Handwriting Analysis
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          {showDetails ? "Hide details" : "How it works"}
        </button>
      </div>

      {showDetails && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="mb-2">Our handwriting comparison system uses AI to analyze:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Letter shapes and formations</li>
            <li>Spacing between words and letters</li>
            <li>Pen pressure and stroke patterns</li>
            <li>Slant angles and baseline alignment</li>
            <li>Unique flourishes and signatures</li>
          </ul>
        </div>
      )}

      {/* Compare Button */}
      <button
        onClick={handleCompare}
        disabled={!isReadyForComparison || loading}
        className={`w-full py-3 text-white font-semibold rounded-lg flex justify-center items-center gap-2 transition-all ${
          !isReadyForComparison || loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-md"
        }`}
      >
        {loading ? "Analyzing..." : "Compare Handwriting"}
      </button>

      {!isReadyForComparison && (
        <p className="text-center text-sm text-gray-500 mt-2">
          Please upload an assignment first.
        </p>
      )}

      {/* Progress Bar */}
      {loading && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Analyzing samples...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Random Fact */}
      {loading && randomFact && (
        <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r text-sm text-yellow-700">
          <strong>Did you know?</strong> {randomFact}
        </div>
      )}

      {/* --- RESULTS SECTION (WITH FIX) --- */}
      {comparisonResult && (
        <div className={`mt-6 p-5 rounded-xl border ${
            comparisonResult.matched 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`text-lg font-semibold mb-2 ${
              comparisonResult.matched
              ? 'text-green-800'
              : 'text-red-800'
          }`}>
            {comparisonResult.matched ? "MATCH FOUND ✅" : "NO MATCH FOUND ❌"}
          </h4>
          <p className={`text-gray-700 text-lg`}>
            Average Similarity: 
            <strong className={`ml-2 font-bold ${
                comparisonResult.matched
                ? 'text-green-700'
                : 'text-red-700'
            }`}>
              {/* ✅ FIX: Changed siamese_similarity to average_similarity */}
              {comparisonResult.average_similarity?.toFixed(1)}%
            </strong>
          </p>
          <div className="text-xs text-gray-500 mt-2">
              {/* ✅ FIX: Changed siamese_similarities to individual_similarities */}
              (Individual page scores: {comparisonResult.individual_similarities?.join('%, ')}%)
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default CompareHandwriting;

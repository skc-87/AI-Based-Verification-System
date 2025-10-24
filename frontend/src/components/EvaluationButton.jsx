
import React, { useState } from "react";


const EvaluationButton = ({ assignment, onEvaluate, isEvaluated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [marks, setMarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!marks) return;
      
      setIsSubmitting(true);
      try {
        await onEvaluate(assignment._id, marks);
        setIsOpen(false);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className={`px-3 py-1 rounded ${
            isEvaluated 
              ? "bg-green-500 text-white" 
              : "bg-yellow-500 text-white hover:bg-yellow-600"
          }`}
          disabled={isEvaluated}
        >
          {isEvaluated ? "Evaluated" : "Evaluate"}
        </button>
  
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-opacity-50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <div className="relative bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
              <h3 className="text-xl font-semibold mb-4">
                Evaluate {assignment.studentName}'s Assignment
              </h3>
              <form onSubmit={handleSubmit}>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="Enter marks (0-20)"
                  className="w-full p-2 mb-4 border rounded"
                  required
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {isSubmitting ? "Saving..." : "Save Marks"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default EvaluationButton;
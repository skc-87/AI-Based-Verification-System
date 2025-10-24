import { toast } from "react-toastify";
import { useState, useRef } from "react";

const FileUploadForm = ({ onUpload, isLoading }) => {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!studentId && !studentName) {
      toast.error('Please provide either Student ID or Name');
      return;
    }

    onUpload({ studentId, studentName, file });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-md"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Upload Handwriting Sample</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
            Student ID
          </label>
          <input
            id="studentId"
            type="text"
            placeholder="Enter Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            aria-label="Student ID"
          />
        </div>

        <div className="flex items-center my-2">
          <hr className="flex-grow border-gray-200" />
          <span className="px-3 text-sm text-gray-400 font-medium">OR</span>
          <hr className="flex-grow border-gray-200" />
        </div>

        <div>
          <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
            Student Name
          </label>
          <input
            id="studentName"
            type="text"
            placeholder="Enter Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            aria-label="Student Name"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document File
          </label>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
            onClick={handleFileClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              aria-label="File upload"
              required
            />
            
            <div className="flex flex-col items-center justify-center space-y-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-10 w-10 ${file ? 'text-blue-500' : 'text-gray-400'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              {file ? (
                <>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">
                    <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">JPG, PNG or PDF (max. 5MB)</p>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !file}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors
            ${(isLoading || !file) ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : (
            'Upload Document'
          )}
        </button>
      </div>
    </form>
  );
};

export default FileUploadForm;
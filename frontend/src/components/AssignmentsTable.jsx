import DataTable from "./DataTable";
import EvaluationButton from "./EvaluationButton";

const AssignmentsTable = ({ data, isLoading, API_BASE_URL, searchTerm, handleEvaluate }) => {
  const filteredData = data.filter((assignment) =>
    assignment.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "studentName", header: "Student Name" },
    { key: "fileName", header: "Title" },
    { key: "description", header: "Description" },
    { 
      key: "uploadDate", 
      header: "Upload Date",
      render: (item) => new Date(item.uploadDate).toLocaleString()
    },
    {
      key: "actions",
      header: "File",
      render: (item) => (
        <a
          href={`${API_BASE_URL}/view-assignment/${item.studentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          aria-label={`Download assignment for ${item.studentName}`}
        >
          view
        </a>
      )
    },
    {
      key: "evaluation",
      header: "Evaluation",
      render: (item) => (
        <EvaluationButton 
          assignment={item} 
          onEvaluate={handleEvaluate} 
          isEvaluated={item.marks !== null && item.marks !== undefined}
        />
      )
    }
  ];

  return (
    <div className="my-8 p-6 rounded-xl bg-white shadow-lg border border-transparent relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      {/* Gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-xl -z-10"></div>
      
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📌 Assignments
          </h2>
          {filteredData.length > 0 && (
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
              {filteredData.length} {filteredData.length === 1 ? 'assignment' : 'assignments'}
            </span>
          )}
        </div>
  
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <DataTable
            title="assignments"
            data={filteredData}
            columns={[
              { 
                key: "studentName", 
                header: "Student Name",
                headerClass: "font-semibold text-gray-700",
                cellClass: "font-medium text-gray-900"
              },
              { 
                key: "fileName", 
                header: "Title",
                headerClass: "font-semibold text-gray-700",
                cellClass: "text-gray-800"
              },
              { 
                key: "description", 
                header: "Description",
                headerClass: "font-semibold text-gray-700",
                cellClass: "text-gray-600 truncate max-w-xs"
              },
              { 
                key: "uploadDate", 
                header: "Upload Date",
                headerClass: "font-semibold text-gray-700",
                cellClass: "text-gray-500",
                render: (item) => new Date(item.uploadDate).toLocaleString()
              },
              {
                key: "actions",
                header: "File",
                headerClass: "font-semibold text-gray-700",
                cellClass: "text-blue-600 hover:text-blue-800 transition-colors duration-200",
                render: (item) => (
                  <a
                    href={`${API_BASE_URL}/view-assignment/${item.studentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:underline"
                    aria-label={`Download assignment for ${item.studentName}`}
                  >
                    View
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                )
              },
              {
                key: "evaluation",
                header: "Evaluation",
                headerClass: "font-semibold text-gray-700",
                cellClass: "",
                render: (item) => (
                  <EvaluationButton 
                    assignment={item} 
                    onEvaluate={handleEvaluate} 
                    isEvaluated={item.marks !== null && item.marks !== undefined}
                  />
                )
              }
            ]}
            isLoading={isLoading}
            emptyMessage={
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-gray-100 rounded-full mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <p className="text-lg text-gray-500">No assignments found</p>
                {searchTerm && (
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
                )}
              </div>
            }
            rowClass="hover:bg-gray-50 transition-colors duration-150"
            headerClass="bg-gray-50 text-left"
            loadingComponent={
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default AssignmentsTable;
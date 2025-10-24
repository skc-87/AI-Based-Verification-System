const DataTable = ({ title, data, columns, isLoading, emptyMessage }) => {
  if (isLoading) {
    return (
      <p className="text-center text-gray-500">
        Loading {title.toLowerCase()}...
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        {typeof emptyMessage === "string" ? (
          <p className="text-gray-500 italic">{emptyMessage}</p>
        ) : (
          emptyMessage
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-blue-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`py-3 px-4 border-b text-left ${
                  column.headerClass || ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`py-3 px-4 border-b ${
                    column.cellClass || ""
                  }`}
                >
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

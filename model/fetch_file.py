import sys
import os
import json
import shutil
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

if len(sys.argv) != 4:
    print(json.dumps({"status": "error", "message": "invalid_number_of_arguments"}))
    sys.exit(1)

student_id = sys.argv[1]
file_category = sys.argv[2]
token = sys.argv[3]

# Connect to MongoDB
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print(json.dumps({"status": "error", "message": "mongodb_not_set"}))
    sys.exit(1)

try:
    client = MongoClient(MONGO_URI)
    db = client["test"]
    collection = db["files"]
except Exception:
    print(json.dumps({"status": "error", "message": "database_connection_failed"}))
    sys.exit(1)

output_dir = os.path.join(os.path.dirname(__file__), "fetched_files")

# Clean up and create output directory
try:
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)
except Exception:
    print(json.dumps({"status": "error", "message": "failed_to_create_output_directory"}))
    client.close()
    sys.exit(1)

result_files = []

def save_file(document, label):
    try:
        content_type = document["contentType"]
        extension = {
            "application/pdf": ".pdf",
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg"
        }.get(content_type)

        if not extension:
            return None

        filename = f"{label}_{student_id}{extension}"
        file_path = os.path.join(output_dir, filename)

        with open(file_path, "wb") as f:
            f.write(document["fileData"])

        return file_path
    except Exception:
        return None

# Handle different file category requests
if file_category == "all":
    # Fetch handwriting sample
    sample_doc = collection.find_one({
        "studentId": student_id,
        "fileCategory": "handwriting_sample"
    })

    if not sample_doc:
        print(json.dumps({"status": "error", "message": "handwriting_sample_not_found"}))
        client.close()
        sys.exit(1)

    sample_path = save_file(sample_doc, "handwriting_sample")
    if not sample_path:
        print(json.dumps({"status": "error", "message": "failed_to_save_sample"}))
        client.close()
        sys.exit(1)
    result_files.append(sample_path)

    # Fetch latest assignment
    assignment_doc = collection.find_one(
        {"studentId": student_id, "fileCategory": "assignment"},
        sort=[("uploadDate", -1)]
    )

    if not assignment_doc:
        print(json.dumps({"status": "error", "message": "assignment_not_found"}))
        client.close()
        sys.exit(1)

    assignment_path = save_file(assignment_doc, "latest_assignment")
    if not assignment_path:
        print(json.dumps({"status": "error", "message": "failed_to_save_assignment"}))
        client.close()
        sys.exit(1)
    result_files.append(assignment_path)

else:
    # Fetch specific file category
    file_doc = collection.find_one({
        "studentId": student_id,
        "fileCategory": file_category
    })

    if not file_doc:
        print(json.dumps({"status": "error", "message": f"{file_category}_not_found"}))
        client.close()
        sys.exit(1)

    file_path = save_file(file_doc, file_category)
    if not file_path:
        print(json.dumps({"status": "error", "message": f"failed_to_save_{file_category}"}))
        client.close()
        sys.exit(1)
    result_files.append(file_path)

# Success response
print(json.dumps({
    "status": "success",
    "files": result_files
}))

client.close()
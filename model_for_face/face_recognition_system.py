# face_recognition_system.py
import cv2
import numpy as np
import csv
import os
import sys
import jwt
import json
from datetime import datetime
from deepface import DeepFace

# Suppress TensorFlow informational messages
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

JWT_SECRET = "4349ef690de9a0fa8704f4d8ec9238e01a8446000d6d4cbc494dfa397468772b"

class ArcFaceSystem:
    def __init__(self):
        self.registered_students = []
        self.load_registered_students()
        self.detector_backend = 'mtcnn'
        self.embedding_model = 'ArcFace'
        self.threshold = 0.68
        self.distance_metric = 'cosine'
        self.duplicate_threshold = 0.80

    def load_registered_students(self):
        """Load registered students from the CSV file into memory."""
        if os.path.exists('registered_students.csv'):
            try:
                with open('registered_students.csv', 'r', newline='') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        self.registered_students.append({
                            'id': row['id'],
                            'name': row['name'],
                            'embedding': np.array(eval(row['embedding']))
                        })
            except (IOError, csv.Error) as e:
                print(f"Warning: Could not load students. Error: {e}", file=sys.stderr)
                self.registered_students = []

    def _adjust_brightness(self, img: np.ndarray) -> np.ndarray:
        """Improves brightness and contrast of an image using CLAHE."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        v_enhanced = clahe.apply(v)
        final_hsv = cv2.merge((h, s, v_enhanced))
        img_enhanced = cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)
        return img_enhanced

    def check_duplicate_face(self, new_embedding):
        """Check if the face embedding already exists in the database."""
        for student in self.registered_students:
            ref_embedding = student['embedding']
            similarity = np.dot(new_embedding, ref_embedding) / (
                np.linalg.norm(new_embedding) * np.linalg.norm(ref_embedding)
            )
            if similarity > self.duplicate_threshold:
                return True, student['id'], student['name'], similarity
        return False, None, None, 0.0

    def register_student(self, student_id: str, name: str, image_path: str) -> tuple:
        """Registers a new student by generating and storing their face embedding."""
        try:
            if any(student['id'] == student_id for student in self.registered_students):
                return False, f"Student ID '{student_id}' is already registered."

            if not student_id.isalnum():
                return False, "Invalid student ID format. Use only letters and numbers."

            img = cv2.imread(image_path)
            if img is None:
                return False, f"Cannot read the image file at: {image_path}"

            embedding_obj = DeepFace.represent(
                img_path=image_path, model_name=self.embedding_model,
                detector_backend=self.detector_backend, enforce_detection=True
            )

            if len(embedding_obj) > 1:
                return False, "Multiple faces were detected. Please use an image with only one person."

            new_embedding = embedding_obj[0]['embedding']
            new_embedding_array = np.array(new_embedding)

            is_duplicate, existing_id, existing_name, similarity = self.check_duplicate_face(new_embedding_array)
            if is_duplicate:
                return False, f"Face already registered as Student ID: {existing_id}, Name: {existing_name} (Similarity: {similarity:.2%}). Cannot register duplicate face."

            file_exists = os.path.exists('registered_students.csv') and os.path.getsize('registered_students.csv') > 0
            with open('registered_students.csv', 'a', newline='') as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(['id', 'name', 'embedding'])
                writer.writerow([student_id, name, list(new_embedding)])

            self.registered_students.append({
                'id': student_id, 'name': name, 'embedding': new_embedding_array
            })

            return True, "Student registered successfully."

        except ValueError:
            return False, "Registration failed: No face could be detected in the image."
        except Exception as e:
            return False, f"An unexpected registration error occurred: {str(e)}"

    # MODIFIED: Accept date parameter and use it instead of current date
    def take_attendance(self, subject: str, image_path: str, attendance_date: str) -> tuple:
        """
        Takes attendance by detecting faces, matching them, and saving a new
        image with boxes and similarity scores. Uses the provided date instead of current date.
        """
        try:
            if not self.registered_students:
                return False, "No students are registered in the system. Cannot take attendance."

            img = cv2.imread(image_path)
            if img is None:
                return False, f"Cannot read the image file at: {image_path}"

            # Validate the provided date
            try:
                datetime.strptime(attendance_date, '%Y-%m-%d')
            except ValueError:
                return False, f"Invalid date format: {attendance_date}. Expected YYYY-MM-DD."

            # Step 1: Adjust brightness/contrast of the image
            processed_img = self._adjust_brightness(img)

            present_student_ids = set()
            
            # Step 2: Extract faces from the adjusted image
            faces = DeepFace.extract_faces(
                img_path=processed_img,
                detector_backend=self.detector_backend,
                enforce_detection=False
            )

            for face_data in faces:
                if face_data['confidence'] == 0: 
                    continue

                # Get coordinates for drawing the box
                x, y, w, h = face_data['facial_area']['x'], face_data['facial_area']['y'], face_data['facial_area']['w'], face_data['facial_area']['h']
                
                # The cropped face image is already provided by extract_faces
                face_image = face_data['face']
                
                embedding_obj = DeepFace.represent(
                    img_path=face_image, model_name=self.embedding_model, detector_backend='skip'
                )
                
                test_embedding = np.array(embedding_obj[0]['embedding'])
                best_match_student_id = None
                best_match_student_name = "Unknown"
                max_similarity = 0.0

                for student in self.registered_students:
                    ref_embedding = student['embedding']
                    similarity = np.dot(test_embedding, ref_embedding) / (
                        np.linalg.norm(test_embedding) * np.linalg.norm(ref_embedding)
                    )
                    if similarity > self.threshold and similarity > max_similarity:
                        max_similarity = similarity
                        best_match_student_id = student['id']
                        best_match_student_name = student['name']

                # Step 3: Draw boxes and labels on the image
                if best_match_student_id:
                    present_student_ids.add(best_match_student_id)
                    label = f"{best_match_student_name} ({max_similarity:.2f})"
                    color = (0, 255, 0) # Green for recognized
                else:
                    label = "Unknown"
                    color = (0, 0, 255) # Red for unrecognized
                
                # Draw the rectangle around the face
                cv2.rectangle(processed_img, (x, y), (x + w, y + h), color, 2)
                # Draw the label text above the rectangle
                cv2.putText(processed_img, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            # Step 4: Save the processed image to a new file
            base, ext = os.path.splitext(image_path)
            output_image_path = f"{base}_processed{ext}"
            cv2.imwrite(output_image_path, processed_img)

            # Step 5: Save attendance with the provided date instead of current date
            self._save_full_attendance_report(subject, present_student_ids, attendance_date)

            if not present_student_ids:
                return True, "Attendance taken. No recognized students were found; all marked absent."

            return True, f"Attendance recorded for {attendance_date}. {len(present_student_ids)} students marked as Present."

        except ValueError:
            self._save_full_attendance_report(subject, set(), attendance_date)
            return True, "No faces were detected in the image. All students marked absent."
        except Exception as e:
            return False, f"An unexpected attendance error occurred: {str(e)}"

    # MODIFIED: Accept date parameter
    def _save_full_attendance_report(self, subject: str, present_ids: set, attendance_date: str):
        """Helper function to save a complete attendance list for all registered students."""
        current_time = datetime.now().strftime("%H:%M:%S")
        # Use the provided attendance_date instead of current date
        
        attendance_records = []
        for student in self.registered_students:
            status = 'Present' if student['id'] in present_ids else 'Absent'
            attendance_records.append({
                'student_id': student['id'], 
                'name': student['name'], 
                'date': attendance_date,  # Use the provided date
                'time': current_time, 
                'subject': subject, 
                'status': status
            })
            
        if not attendance_records:
            return

        file_exists = os.path.exists('attendance.csv') and os.path.getsize('attendance.csv') > 0
        with open('attendance.csv', 'a', newline='') as f:
            fieldnames = ['student_id', 'name', 'date', 'time', 'subject', 'status']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerows(attendance_records)

    def list_registered_students(self):
        """Utility method to list all registered students (for debugging)."""
        return [{'id': s['id'], 'name': s['name']} for s in self.registered_students]

def validate_token(token):
    """Validate JWT token. Returns True if valid, False otherwise."""
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return True
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return False

def main():
    """Main function to handle command-line operations."""
    try:
        if len(sys.argv) < 3:
            raise ValueError("Insufficient arguments.")

        operation = sys.argv[1]
        auth_token = sys.argv[-1]

        if not validate_token(auth_token):
            print(json.dumps({"success": False, "message": "Unauthorized: Invalid token."}))
            return

        system = ArcFaceSystem()

        if operation == "register":
            if len(sys.argv) != 6:
                raise ValueError("Usage: register <id> <name> <path> <token>")
            student_id, name, image_path = sys.argv[2], sys.argv[3], sys.argv[4]
            success, message = system.register_student(student_id, name, image_path)
            print(json.dumps({"success": success, "message": message}))

        elif operation == "attendance":
            # Updated to expect 6 arguments: attendance <subject> <path> <date> <token>
            if len(sys.argv) != 6:
                raise ValueError("Usage: attendance <subject> <path> <date> <token>")
            subject, image_path, attendance_date = sys.argv[2], sys.argv[3], sys.argv[4]
            success, message = system.take_attendance(subject, image_path, attendance_date)
            print(json.dumps({"success": success, "message": message}))
            
        elif operation == "list":
            students = system.list_registered_students()
            print(json.dumps({"success": True, "count": len(students), "students": students}))
            
        else:
            raise ValueError(f"Invalid operation: '{operation}'.")

    except Exception as e:
        print(json.dumps({"success": False, "message": "A critical system error occurred.", "error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
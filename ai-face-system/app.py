from flask import Flask, request, jsonify
from deepface import DeepFace
import os

app = Flask(__name__)

DB_PATH = "known_students"

# Create folder if it doesn't exist
if not os.path.exists(DB_PATH):
    os.makedirs(DB_PATH)

@app.route('/verify-face', methods=['POST'])
def verify_face():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "No image uploaded"}), 400
        
    file = request.files['image']
    
    # 1. Temporarily save the received image to check
    temp_path = "temp_captured.jpg"
    file.save(temp_path)
    
    try:
        # Compare with photos inside DB_PATH (known_students) folder
        # model_name can be set to 'VGG-Face', 'Facenet', 'OpenFace', etc.
        result = DeepFace.find(
            img_path=temp_path, 
            db_path=DB_PATH, 
            model_name="VGG-Face", 
            enforce_detection=True
        )
        
        # Remove the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        # If a face matches, the first element of the result list contains the data
        if len(result) > 0 and not result[0].empty:
            # Get the path of the matched photo
            matched_img_path = result[0]['identity'][0]
            filename = os.path.basename(matched_img_path)
            student_id = os.path.splitext(filename)[0]
            
            return jsonify({
                "status": "success",
                "message": "Face Matched Successfully",
                "student_id": student_id
            }), 200
        else:
            return jsonify({"status": "failed", "message": "Face does not match any student"}), 200
            
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        # DeepFace raises an exception if no face is detected
        return jsonify({"status": "failed", "message": "No face detected or system error"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
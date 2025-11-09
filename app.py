"""
Flask API Example - Resume Processing Service
Shows how to integrate ResumeProcessor with Flask for file uploads
Includes two-level caching:
1. Parsed resume cache (by file hash)
2. Screening result cache (by file hash + job details)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from main import ResumeProcessor
import logging
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
logging.basicConfig(level=logging.INFO)

# Initialize the processor and cache manager once at startup
processor = ResumeProcessor()


@app.route("/api/parse", methods=["POST"])
def parse_resume():
    """
    Parse a resume file with caching.
    Uses file hash to cache parsed resumes and avoid re-parsing.

    Request:
        - file: Resume file (PDF or DOCX)

    Returns:
        JSON with parsed resume data and cache status
    """
    try:
        # Check if file is present
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]

        file_name = (file.filename or "").strip()
        if not file_name:
            return jsonify({"error": "No file selected"}), 400

        # Check file extension
        if not file_name.lower().endswith((".pdf", ".docx", ".doc")):
            return (
                jsonify(
                    {"error": "Invalid file format. Only PDF and DOCX are supported"}
                ),
                400,
            )

        # Read file bytes
        file_bytes = file.read()

        # Parse resume
        parsed = processor.parse_resume_from_bytes(file_bytes, file_name)

        return (
            jsonify(
                {
                    "success": True,
                    "data": parsed,
                    "cached": False
                }
            ),
            200,
        )

    except Exception as e:
        logging.error(f"Error parsing resume: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/screen", methods=["POST"])
def screen_resume():
    """
    Screen a resume against job requirements with two-level caching.

    Caching Strategy:
    1. Check if screening result exists (file hash + job details) → return if found
    2. Check if parsed resume exists (file hash only) → use it for screening
    3. Otherwise, parse resume, cache it, then screen it, cache screening result

    Request:
        - file: Resume file (PDF or DOCX)
        - job_title: Job position title
        - job_description: Job description text
        - weights (optional): Custom scoring weights as JSON

    Returns:
        JSON with both parsed and screening results, plus cache status
    """
    try:
        # Check if file is present
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        file_name = (file.filename or "").strip()
        if not file_name:
            return jsonify({"error": "No file selected"}), 400

        # Check file extension
        if not file_name.lower().endswith((".pdf", ".docx", ".doc")):
            return (
                jsonify(
                    {"error": "Invalid file format. Only PDF and DOCX are supported"}
                ),
                400,
            )

        # Get job details
        job_title = (request.form.get("job_title") or "").strip()
        job_description = (request.form.get("job_description") or "").strip()

        if not job_title or not job_description:
            return jsonify({"error": "job_title and job_description are required"}), 400

        # Optional: Custom weights
        weights = None
        weights_str = request.form.get("weights")
        if weights_str:
            try:
                weights = json.loads(weights_str)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON format for weights"}), 400

        # Read file bytes
        file_bytes = file.read()

        logging.info("Parsing and screening the resume and job description")

        # Parse resume
        parsed = processor.parse_resume_from_bytes(file_bytes, file_name)

        # Store parsed resume in cache
        # cache_manager.store_parsed_resume(file_hash, parsed)

        # Screen resume
        screened = processor.screen_resume(parsed, job_title, job_description, weights)

        # Store screening result in cache
        # cache_manager.store_screening_result(
        #     file_hash, job_title, job_description, screened
        # )

        result = {"parsed": parsed, "screened": screened}

        return (
            jsonify(
                {
                    "success": True,
                    "data": result,
                    "cache_status": {
                        "parsed_cached": False,
                        "screening_cached": False
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logging.error(f"Error screening resume: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/optimize", methods=["POST"])
def optimize_resume():
    try:
        # Check if file is present
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        file_name = (file.filename or "").strip()
        if not file_name:
            return jsonify({"error": "No file selected"}), 400

        # Check file extension
        if not file_name.lower().endswith((".pdf", ".docx", ".doc")):
            return (
                jsonify(
                    {"error": "Invalid file format. Only PDF and DOCX are supported"}
                ),
                400,
            )
        
        # Read file bytes
        file_bytes = file.read()

        # Get job details
        job_title = (request.form.get("job_title") or "").strip()
        job_description = (request.form.get("job_description") or "").strip()

        if not job_title or not job_description:
            return jsonify({"error": "job_title and job_description are required"}), 400
        
        # Optional: Custom weights
        weights = None
        weights_str = request.form.get("weights")
        if weights_str:
            try:
                weights = json.loads(weights_str)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON format for weights"}), 400
        
        logging.info("Parsing and screening the resume and job description")

        # Parse resume
        parsed = processor.parse_resume_from_bytes(file_bytes, file_name)

        # Screen resume
        screened = processor.screen_resume(parsed, job_title, job_description, weights)

        # Optimize resume
        optimization_suggestions = processor.optimise_resume(parsed, job_title, job_description, screened)

        result = {"parsed": parsed, "screened": screened, "optimization": optimization_suggestions}

        return (
            jsonify(
                {
                    "success": True,
                    "data": result,
                    "cache_status": {
                        "parsed_cached": False,
                        "screening_cached": False,
                        "optimization_cached": False
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logging.error(f"Error screening resume: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "Resume Processing API"}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

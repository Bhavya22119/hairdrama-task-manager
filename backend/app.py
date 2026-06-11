from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = False
app.config["MAIL_USERNAME"] = os.getenv("GMAIL_USER")
app.config["MAIL_PASSWORD"] = os.getenv("GMAIL_APP_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("GMAIL_USER")
app.config["MAIL_TIMEOUT"] = 20

mail = Mail(app)


def validate_mail_config():
    if not app.config["MAIL_USERNAME"] or not app.config["MAIL_PASSWORD"]:
        return "GMAIL_USER and GMAIL_APP_PASSWORD must be set on the backend"

    return None


def send_task_email(subject, recipient, body):
    config_error = validate_mail_config()
    if config_error:
        return config_error

    msg = Message(
        subject=subject,
        recipients=[recipient],
        body=body,
    )
    mail.send(msg)
    return None


@app.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/")
def home():
    return {"message": "Backend is running"}


@app.route("/send-task-created-email", methods=["POST", "OPTIONS"])
def send_task_created_email():
    if request.method == "OPTIONS":
        return jsonify({"message": "ok"}), 200

    try:
        data = request.get_json(force=True)

        assigned_to = data.get("assigned_to")
        title = data.get("title")
        description = data.get("description")
        created_by = data.get("created_by")

        if not assigned_to or not title:
            return jsonify({"error": "assigned_to and title are required"}), 400

        error = send_task_email(
            "New Task Assigned",
            assigned_to,
            f"""
Hello,

A new task has been assigned to you.

Title: {title}
Description: {description}
Created By: {created_by}

Regards,
Hairdrama Task Manager
"""
        )

        if error:
            return jsonify({"error": error}), 500

        return jsonify({"message": "Task created email sent"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/send-task-completed-email", methods=["POST", "OPTIONS"])
def send_task_completed_email():
    if request.method == "OPTIONS":
        return jsonify({"message": "ok"}), 200

    try:
        data = request.get_json(force=True)

        assigned_to = data.get("assigned_to")
        title = data.get("title")
        completed_by = data.get("completed_by")

        if not assigned_to or not title:
            return jsonify({"error": "assigned_to and title are required"}), 400

        error = send_task_email(
            "Task Completed",
            assigned_to,
            f"""
Hello,

Your task has been marked as completed.

Title: {title}
Completed By: {completed_by}

Regards,
Hairdrama Task Manager
"""
        )

        if error:
            return jsonify({"error": error}), 500

        return jsonify({"message": "Task completed email sent"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

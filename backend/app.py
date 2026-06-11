from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=False
)

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("GMAIL_USER")
app.config["MAIL_PASSWORD"] = os.getenv("GMAIL_APP_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("GMAIL_USER")

mail = Mail(app)


@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response


@app.route("/")
def home():
    return {"message": "Backend is running"}


@app.route("/send-task-created-email", methods=["POST", "OPTIONS"])
def send_task_created_email():
    if request.method == "OPTIONS":
        return jsonify({"message": "ok"}), 200

    try:
        data = request.get_json()

        assigned_to = data.get("assigned_to")
        title = data.get("title")
        description = data.get("description")
        created_by = data.get("created_by")

        msg = Message(
            subject="New Task Assigned",
            recipients=[assigned_to],
            body=f"""
Hello,

A new task has been assigned to you.

Title: {title}
Description: {description}
Created By: {created_by}

Regards,
Hairdrama Task Manager
"""
        )

        mail.send(msg)

        return jsonify({"message": "Task created email sent"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/send-task-completed-email", methods=["POST", "OPTIONS"])
def send_task_completed_email():
    if request.method == "OPTIONS":
        return jsonify({"message": "ok"}), 200

    try:
        data = request.get_json()

        assigned_to = data.get("assigned_to")
        title = data.get("title")
        completed_by = data.get("completed_by")

        msg = Message(
            subject="Task Completed",
            recipients=[assigned_to],
            body=f"""
Hello,

Your task has been marked as completed.

Title: {title}
Completed By: {completed_by}

Regards,
Hairdrama Task Manager
"""
        )

        mail.send(msg)

        return jsonify({"message": "Task completed email sent"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
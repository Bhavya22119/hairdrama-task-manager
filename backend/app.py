from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("GMAIL_USER")
app.config["MAIL_PASSWORD"] = os.getenv("GMAIL_APP_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("GMAIL_USER")

mail = Mail(app)

@app.route("/")
def home():
    return {"message": "Backend is running"}

@app.route("/send-task-created-email", methods=["POST"])
def send_task_created_email():
    data = request.get_json()

    assigned_to = data.get("assigned_to")
    title = data.get("title")
    description = data.get("description")
    created_by = data.get("created_by")

    if not assigned_to or not title:
        return jsonify({"error": "assigned_to and title are required"}), 400

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


@app.route("/send-task-completed-email", methods=["POST"])
def send_task_completed_email():
    data = request.get_json()

    assigned_to = data.get("assigned_to")
    title = data.get("title")
    completed_by = data.get("completed_by")

    if not assigned_to or not title:
        return jsonify({"error": "assigned_to and title are required"}), 400

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


if __name__ == "__main__":
    app.run(debug=True)
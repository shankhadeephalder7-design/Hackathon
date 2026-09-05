from flask import Flask, request, jsonify
from database import get_db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
def create_table():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            mobile TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


create_table()

@app.route("/")
def home():
    return "SwiftApply Backend is working!"

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    name = data["name"]
    email = data["email"]
    mobile = data["mobile"]
    password = generate_password_hash(data["password"])

    conn = get_db()

    conn.execute(
        "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)",
        (name, email, mobile, password)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Account created successfully"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data["email"]
    password = data["password"]

    conn = get_db()

    user = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    conn.close()

    if user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "mobile": user["mobile"]
        }
    })

if __name__ == "__main__":
    app.run(debug=True)
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

    if not data:
        return jsonify({"error": "No data received"}), 400

    name = data.get("name")
    email = data.get("email")
    mobile = data.get("mobile")
    password = data.get("password")

    if not name or not email or not mobile or not password:
        return jsonify({"error": "All fields are required"}), 400

    conn = get_db()

    # Check email and mobile separately
    email_exists = conn.execute(
        "SELECT 1 FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    mobile_exists = conn.execute(
        "SELECT 1 FROM users WHERE mobile = ?",
        (mobile,)
    ).fetchone()

    if email_exists and mobile_exists:
        conn.close()
        return jsonify({
            "error": "Email and mobile number already exist"
        }), 409

    if email_exists:
        conn.close()
        return jsonify({
            "error": "Email already exists"
        }), 409

    if mobile_exists:
        conn.close()
        return jsonify({
            "error": "Mobile number already exists"
        }), 409

    hashed_password = generate_password_hash(password)

    try:
        conn.execute(
            """
            INSERT INTO users (name, email, mobile, password)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, mobile, hashed_password)
        )

        conn.commit()

    except Exception:
        conn.rollback()
        return jsonify({
            "error": "Could not create account"
        }), 500

    finally:
        conn.close()

    return jsonify({
        "message": "Account created successfully"
    }), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()

    user = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    conn.close()

    if user is None:
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    if not check_password_hash(user["password"], password):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "mobile": user["mobile"]
        }
    }), 200


if __name__ == "__main__":
    app.run(debug=True)
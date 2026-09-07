import docx
import pypdf
import re
import streamlit as st

# Page Configuration
st.set_page_config(page_title="SWIFTAPPLY", page_icon="💼", layout="wide")

# Extract text from DOCX or PDF
def extract_text_from_file(uploaded_file):
    text = ""
    try:
        if uploaded_file.name.endswith(".docx"):
            doc = docx.Document(uploaded_file)
            text = "\n".join([p.text for p in doc.paragraphs if p.text])
        elif uploaded_file.name.endswith(".pdf"):
            reader = pypdf.PdfReader(uploaded_file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        text = f"Error reading file: {e}"
    return text

# Calculate Skill Match Score and Gap
def calculate_match(resume_text, required_skills):
    resume_lower = resume_text.lower()
    matched = [skill for skill in required_skills if skill.lower() in resume_lower]
    missing = [skill for skill in required_skills if skill.lower() not in resume_lower]
    score = int((len(matched) / len(required_skills)) * 100) if required_skills else 0
    return score, matched, missing

# Analyze ATS Resume Health
def check_ats_health(text):
    word_count = len(text.split())
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
    has_phone = bool(re.search(r'\+?\d[\d -]{8,}\d', text))
    
    score = 0
    if word_count >= 100: score += 40
    if has_email: score += 30
    if has_phone: score += 30
    
    return score, word_count, has_email, has_phone

# Sidebar: Backend Toggle
st.sidebar.title("⚙️ Backend Options")
use_fastapi = st.sidebar.toggle("Connect to FastAPI Backend", value=False)
if use_fastapi:
    api_url = st.sidebar.text_input("FastAPI Endpoint URL", "http://127.0.0.1:8000/api/match")
    st.sidebar.info("Frontend is configured to dispatch payloads to FastAPI.")

# Header
st.title("SWIFTAPPLY 💼")
st.subheader("Automated Job Application & Matching Engine")
st.write("Upload your resume to receive live skill match scores, gap analysis, and ATS health feedback.")

st.divider()

# 1. Resume Upload & Analysis Section
st.header("1. Upload Resume")
uploaded_file = st.file_uploader("Upload your resume (PDF or DOCX)", type=["pdf", "docx"])

resume_text = ""
if uploaded_file is not None:
    st.success(f"File uploaded successfully: {uploaded_file.name}")
    resume_text = extract_text_from_file(uploaded_file)
    
    # Run ATS Readiness Check
    ats_score, words, email_found, phone_found = check_ats_health(resume_text)
    
    st.write("### 📊 ATS Readiness Audit")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("ATS Health Score", f"{ats_score}%")
    m2.metric("Word Count", words)
    m3.metric("Email Address", "Detected ✅" if email_found else "Missing ⚠️")
    m4.metric("Phone Number", "Detected ✅" if phone_found else "Missing ⚠️")

    with st.expander("📄 View Extracted Resume Text"):
        if resume_text.strip():
            st.text_area("Extracted Content", resume_text, height=180)
        else:
            st.warning("No readable text found in this file.")

st.divider()

# 2. Recommended Roles with Dynamic Matching
st.header("2. Recommended Roles & Match Analysis")

jobs = [
    {
        "title": "Frontend Developer",
        "location": "Remote",
        "skills": ["React", "JavaScript", "HTML", "CSS", "Git"],
        "btn_key": "btn1"
    },
    {
        "title": "Python Developer",
        "location": "Hybrid",
        "skills": ["Python", "Streamlit", "SQL", "FastAPI", "Git"],
        "btn_key": "btn2"
    },
    {
        "title": "UI/UX Designer",
        "location": "On-site",
        "skills": ["Figma", "Prototyping", "CSS", "Wireframing", "User Research"],
        "btn_key": "btn3"
    }
]

cols = st.columns(3)

for idx, job in enumerate(jobs):
    with cols[idx]:
        st.subheader(job["title"])
        st.write(f"**Location:** {job['location']}")
        
        if resume_text.strip():
            score, matched, missing = calculate_match(resume_text, job["skills"])
            st.progress(score / 100)
            st.write(f"**Match Score:** {score}%")
            
            st.write("**Matched:**", ", ".join(matched) if matched else "None")
            if missing:
                st.write("⚠️ **Missing:**", ", ".join(missing))
        else:
            st.caption("Upload a resume above to calculate live match percentages.")
            st.write("**Required Skills:**", ", ".join(job["skills"]))

        if st.button(f"Apply for {job['title']}", key=job["btn_key"]):
            st.toast(f"Application submitted for {job['title']}!")

# 3. Automated Cover Letter Generator
if resume_text.strip():
    st.divider()
    st.header("3. Cover Letter Generator")
    selected_job = st.selectbox("Select target role for cover letter:", [j["title"] for j in jobs])
    
    if st.button("Generate Cover Letter"):
        sample_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {selected_job} position. Based on my uploaded resume, my skills align closely with your team's current requirements.

I am confident in my ability to contribute effectively from day one and would welcome the opportunity to discuss my application further.

Best regards,
Applicant"""
        st.text_area("Generated Draft", sample_letter, height=180)
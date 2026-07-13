<div align="center">

# 📲 Attendance System — FOC

### A smart, face-recognition powered attendance platform with a mobile app, admin dashboard, and an AI assistant

[![React Native](https://img.shields.io/badge/React_Native-Expo-20232A?logo=react&logoColor=61DAFB)](https://expo.dev)
[![Flask](https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/BaaS-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![AWS Rekognition](https://img.shields.io/badge/Face_Recognition-AWS_Rekognition-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/rekognition/)
[![Gemini API](https://img.shields.io/badge/AI_Assistant-Gemini_API-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![DigitalOcean](https://img.shields.io/badge/Hosted_on-DigitalOcean-0080FF?logo=digitalocean&logoColor=white)](https://www.digitalocean.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#-license)

</div>

---

## 📖 Overview

**Attendance System — FOC** is a full-stack, AI-assisted attendance management platform built for university-level classes. It replaces manual roll-calls with **facial recognition + GPS geofencing**, giving students a one-tap check-in experience while giving lecturers and admins a real-time dashboard, automated reporting, and a conversational AI assistant to query attendance data in plain English.

The system is composed of four cooperating services:

| Component | Description |
|---|---|
| 📱 **Mobile App** | React Native (Expo) app for students & lecturers — face verification, GPS check-in, timetables, and chat |
| 🖥️ **Admin Web Dashboard** | Next.js dashboard for admins — manage users, courses, timetables, reports, and face registration |
| ⚙️ **Backend API** | Flask REST API — authentication, attendance logic, geofencing, reporting, and the Gemini-powered AI agent |
| 🤖 **AI Face Service** | Secondary Flask microservice for face verification |

---

## ✨ Key Features

- 🎯 **Face-Recognition Check-In** — Students mark attendance via live face capture, verified against AWS Rekognition face collections
- 📍 **GPS Geofencing** — Attendance is only accepted within the geofenced boundary of the classroom (ray-casting & Haversine distance checks)
- 🤖 **Conversational AI Assistant** — Admins & lecturers can query attendance records, generate reports, and get insights using a Gemini-powered chat agent
- 🗓️ **Timetable Management** — Create, assign, and manage class schedules, subjects, and lecturer assignments
- 📊 **Attendance Reports** — Filterable attendance reports and absentee tracking, exportable for record-keeping
- 🩺 **Medical Certificate Uploads** — Students can upload medical documents to justify absences
- 👥 **Role-Based Dashboards** — Separate, tailored experiences for Students, Lecturers, and Admins
- 🔔 **Contact Admin & Notifications** — Built-in communication channel between users and admins
- 🚀 **Automated CI/CD** — Every push to `main` auto-deploys the backend and admin dashboard to DigitalOcean via GitHub Actions

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| 📱 Mobile App Development | React Native (Expo) |
| 💻 Programming Languages | JavaScript, Python, SQL |
| ⚙️ Backend Frameworks | Flask (Python), Node.js |
| 🗄️ Database | PostgreSQL, Supabase |
| 🤖 Conversational AI Assistant | Gemini API |
| 🧠 Face Detection & Recognition | AWS Rekognition |
| 🧰 IDE | Visual Studio Code (VS Code) |
| 🔀 Version Control & CI/CD | Git, GitHub, GitHub Actions |
| ☁️ Hosting | DigitalOcean |

---

## 🏗️ Project Structure

```
Attendence-System-FOC/
├── Mobile/                  # React Native (Expo) mobile app
│   └── src/screens/         # Student, Lecturer & Admin screens
├── frontend-admin/          # Next.js admin web dashboard
│   └── app/admin/           # Dashboard, courses, reports, users, timetable
├── backend-flask/           # Core Flask REST API
│   ├── routes/              # auth, attendance, admin, report, upload, agent
│   ├── services/            # Rekognition, geofencing, AI agent, attendance logic
│   ├── database/            # PostgreSQL / Supabase connection & schema
│   └── utils/                # Helpers, response formatting
├── ai-face-system/          # Auxiliary face-verification microservice
└── .github/workflows/       # CI/CD pipelines for DigitalOcean deployment
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) & npm
- [Python](https://www.python.org/) (3.10+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Supabase](https://supabase.com/) / PostgreSQL database
- An AWS account with **Rekognition** access
- A [Google Gemini API](https://ai.google.dev/) key

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Pasindu115530/Attendence-System-FOC.git
cd Attendence-System-FOC
```

### 2️⃣ Set up the backend (Flask API)

```bash
cd backend-flask
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # Fill in DB, AWS & Gemini credentials
python app.py
```

### 3️⃣ Set up the admin dashboard (Next.js)

```bash
cd frontend-admin
npm install
npm run dev
```
Visit `http://localhost:3000`

### 4️⃣ Set up the mobile app (Expo)

```bash
cd Mobile
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your device, or launch an emulator.

### 5️⃣ (Optional) Run the auxiliary face service

```bash
cd ai-face-system
pip install -r requirements.txt
python app.py
```

---

## ☁️ Deployment

The backend and admin dashboard are hosted on a **DigitalOcean** droplet and deployed automatically via **GitHub Actions**:

- `.github/workflows/deploy.yml` → deploys **`backend-flask`** (Flask API) via SSH, restarting the `flaskapp` systemd service
- `.github/workflows/deploy-frontend.yml` → builds and deploys **`frontend-admin`** (Next.js), restarted with `pm2`

Both pipelines trigger automatically on every push to `main` that touches their respective folders — no manual deployment steps required.

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| 🎓 **Student** | Face check-in, view own attendance, upload medical certificates, chat with support |
| 🧑‍🏫 **Lecturer** | View timetable, class attendance reports, assigned subjects |
| 🛡️ **Admin** | Manage users, courses, timetables, geofences, face registrations, AI-assisted reporting |

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

Made with ❤️ for smarter classroom attendance

</div>

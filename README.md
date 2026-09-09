# 🤖 PrepPilot

PrepPilot is an AI-powered interview preparation platform that helps candidates prepare for technical and behavioral interviews through personalized resume analysis and AI-generated interview sessions.

The platform analyzes a candidate’s resume, identifies their experience level, extracts important career information, and generates interview questions based on their skills, projects, role, and professional background.

## 🌐 Live Links

- 🚀 **Live Website:** [Visit PrepPilot](https://prep-pilot-snowy.vercel.app/)
- ⚙️ **Backend API:** [View Backend](https://preppilot-backend-cd05.onrender.com)

## ✨ Features

* Google authentication using Firebase
* Resume upload and PDF text extraction
* AI-powered resume analysis
* Automatic candidate experience-level classification
* Structured resume information extraction
* Personalized technical and behavioral interview sessions
* Resume embeddings for relevant interview preparation
* Interview history and saved sessions
* Responsive user interface
* Secure authentication using JWT and HTTP-only cookies

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* Tailwind CSS
* React Router
* Axios
* Motion
* Firebase Authentication

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* Multer
* PDF.js

### AI and Data Processing

* OpenAI API
* Resume parsing
* Text embeddings
* AI-generated interview questions

### Deployment and Tools

* Vercel — Frontend deployment
* Render — Backend deployment
* MongoDB — Database
* Firebase — Authentication
* Git and GitHub — Version control

## 🔄 How It Works

1. The user signs in using Google authentication.
2. The user uploads a resume in PDF format.
3. The backend extracts text from the uploaded resume.
4. The AI analyzes the resume and returns structured candidate information.
5. The candidate’s experience level, skills, projects, education, and work history are stored.
6. Resume embeddings are generated and stored for relevant interview preparation.
7. The platform generates personalized interview questions based on the candidate’s profile.
8. The user can practice interviews and access previous interview sessions.

## 📁 Project Structure

```text
PrepPilot/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── server.js
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── context/
│       └── App.jsx
│
└── README.md
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Hawzz7/PrepPilot.git
cd PrepPilot
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

## Environment Variables

### Backend

Create a `.env` file inside the `backend` directory:

```env
PORT=8000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

OPENAI_API_KEY=your_openai_api_key

FRONTEND_URL=http://localhost:5173
```

### Frontend

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Do not commit `.env` files or expose private API keys in the repository.

## Running the Project Locally

### Start the backend

From the `backend` directory:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:8000
```

### Start the frontend

From the `frontend` directory:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

## Deployment

### Frontend

The frontend is deployed using Vercel.

Set the following environment variable in Vercel:

```env
VITE_API_URL=https://preppilot-backend-cd05.onrender.com
```

### Backend

The backend is deployed using Render.

Configure the required environment variables in the Render dashboard, including:

```env
NODE_ENV=production
FRONTEND_URL=https://prep-pilot-snowy.vercel.app
```

The backend uses HTTP-only cookies for authentication and requires credentials-enabled CORS configuration.

## Resume Processing

Uploaded resumes are temporarily stored on the backend server for processing. After the resume text is extracted, analyzed, and stored in the database, the temporary PDF file is deleted.

The application currently stores structured resume data and embeddings rather than permanently storing the uploaded PDF file.

## Future Improvements

* Real-time AI interview conversations
* Voice-based interview practice
* Interview performance analytics
* Detailed feedback and scoring
* More AI model options
* Resume improvement suggestions
* Persistent cloud storage for original resumes
* Company-specific interview preparation
* Advanced question difficulty customization

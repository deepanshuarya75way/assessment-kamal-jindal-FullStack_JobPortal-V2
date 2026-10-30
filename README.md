# 💼 FullStack Job Portal

A full-stack job portal application that connects **students/job seekers** with **recruiters**. Recruiters can create and manage job postings, while students can search, save, and apply for jobs.

Built using **React, Node.js, Express.js, and MongoDB** with secure authentication and role-based access control.

---

## 🚀 Live Demo

🔗 **Live Website:** https://full-stack-job-portal-gilt.vercel.app/

🔗 **Backend API:** https://fullstack-jobportal-2.onrender.com

---

## 📌 Features

### 👨‍🎓 Student Features

- Register and login securely
- Browse available jobs
- Search jobs by keywords
- Filter jobs based on different criteria
- Sort job listings
- View complete job details
- Save/bookmark jobs
- Apply for jobs
- Track application status
- Submit resume links
- Add cover letters
- View application history
- View application deadlines and salary ranges

### 🏢 Recruiter Features

- Recruiter registration and login
- Create job postings
- Edit existing jobs
- Delete job postings
- Manage posted jobs
- View student applications
- Review candidate profiles
- Review resumes and cover letters
- Update application status
- Manage job availability

### 🔐 Security Features

- JWT-based authentication
- HTTP-only cookies
- Password hashing using bcrypt
- Role-based authorization
- Request rate limiting
- Input validation using Zod
- Helmet security middleware
- Environment variable validation
- Protection against duplicate applications

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Authentication & Security

- JWT
- bcrypt
- HTTP-only Cookies
- Helmet
- express-rate-limit
- Zod

### Testing

- Vitest
- Supertest
- MongoDB Memory Server

---

## 📂 Project Structure

```text
FullStack_JobPortal/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── tests/
│   ├── package.json
│   └── ...
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

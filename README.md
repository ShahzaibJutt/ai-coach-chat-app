# AI Coaching Using getstream.io

This project is a chat application with a React-based frontend and a Python (FastAPI) backend. It allows users to create chats and interact with an AI assistant that supports Markdown in its responses. The backend features persistent user memory, authentication, and asynchronous memory updates to provide a personalized coaching experience.

## Features

### Frontend
- **Built with React:** Modern UI built using React.
- **Chat Creation:** Easily create new chats.
- **Markdown Support:** AI responses support Markdown formatting for a rich display.
- **Environment Configuration:** Rename `.env.example` to `.env` and populate with your backend keys.

### Backend
- **Python & FastAPI:** Robust backend built with FastAPI.
- **Persistent Memory:** Maintains a persistent memory for each user.
- **Authentication:** Secure authentication endpoints.
- **Asynchronous Memory Updates:** Memory is updated in the background to improve response times.
- **Environment Configuration:** Rename `.env.example` to `.env` and populate with your secrets.

## Installation and Setup

### Frontend

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
    - Rename the file:
      ```bash
      mv .env.example .env
      ```
    - Open the `.env` file and populate it with your keys for running the backend.

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

### Backend

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Configure Environment Variables:**
    - Rename the file:
      ```bash
      mv .env.example .env
      ```
    - Open the `.env` file and populate it with your secrets.

3. **Sync Dependencies (if needed):**
   ```bash
   uv sync
   ```

4. **Run the Backend Server:**
   ```bash
   uv run uvicorn app.main:app --reload
   ```

## Usage

- **Chat Creation:**  
  Use the frontend application to create new chats and interact with the AI assistant.

- **AI Coaching:**  
  The backend processes user messages, updates persistent memory asynchronously, and returns AI-generated responses formatted in Markdown.


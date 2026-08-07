<div align="center">

# 🤖 Bhavvi AI Assistant

**A Production-Ready Multi-Agent Multimodal LLM Assistant**

*Built with Google Gemini 2.5 · LangGraph · FastAPI · React · ChromaDB · MongoDB*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-FF6B35?style=flat-square)](https://langchain-ai.github.io/langgraph)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[**Live Demo**](https://bhavvi-ai.vercel.app) · [**API Docs**](https://bhavvi-ai-backend.onrender.com/docs) · [**Architecture**](docs/architecture.md) · [**Developer Guide**](docs/developer_guide.md)

</div>

---

## ✨ Overview

**Bhavvi AI Assistant** is a capstone-grade AI application that demonstrates the full spectrum of modern AI engineering. It combines a multi-agent orchestration system (powered by **LangGraph**) with **Retrieval-Augmented Generation**, **Gemini Vision**, and **long-term conversation memory** into a polished, production-ready SaaS-style product.

The system intelligently routes every user request through the most appropriate combination of specialized AI agents — no single monolithic prompt, but a coordinated team of agents each doing one thing exceptionally well.

---

## 🏗️ Architecture at a Glance

```
User Request
     │
     ▼
┌─────────────────────────────────────────┐
│           Planner Agent                 │  ← Analyzes intent, routes request
│         (Gemini 2.5 Flash)              │
└──────┬──────────┬──────────┬────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌─────────┐ ┌────────┐
│ General  │ │ Vision │ │   RAG   │ │ Memory │
│  Agent   │ │ Agent  │ │  Agent  │ │ Agent  │
│  (Chat)  │ │(Images)│ │ (PDFs)  │ │(History│
└──────────┘ └────────┘ └─────────┘ └────────┘
       │          │          │          │
       └──────────┴──────────┴──────────┘
                             │
                             ▼
                  ┌─────────────────┐
                  │ Response Agent  │  ← Merges, formats, cites sources
                  └────────┬────────┘
                           │
                           ▼
                   Streaming Response
```

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🧠 **Multi-Agent Orchestration** | LangGraph-powered planner routes requests to the right agents |
| 📄 **RAG (PDF Q&A)** | Upload PDFs and ask questions with source citations |
| 👁️ **Vision Understanding** | Analyze images, charts, diagrams, screenshots, handwritten notes |
| 💬 **Streaming Responses** | Real-time SSE token streaming like ChatGPT |
| 🧾 **Source Citations** | Every RAG answer includes document + page references |
| 🧠 **Long-term Memory** | Conversation history persisted in MongoDB per user |
| 🔐 **JWT Authentication** | Secure register/login with per-user data isolation |
| 🌙 **Dark / Light Mode** | Polished theme switcher with system preference detection |
| 📱 **Responsive Design** | Works beautifully on desktop and mobile |
| ⚡ **Async Architecture** | Fully async FastAPI backend for high throughput |

---

## 🛠️ Tech Stack

### Frontend
| Library | Purpose |
|---|---|
| React 18 + Vite | Core UI framework + dev tooling |
| Material UI v5 | Component library |
| Framer Motion | Animations and transitions |
| React Router v6 | Client-side routing |
| TanStack Query | Server state + caching |
| Axios | HTTP client with interceptors |
| React Markdown | Markdown rendering in chat |
| React Hook Form + Zod | Forms + validation |
| Zustand | Client-side auth state |

### Backend
| Library | Purpose |
|---|---|
| FastAPI | REST API framework |
| LangGraph | Multi-agent orchestration graph |
| LangChain | RAG pipeline utilities |
| `langchain-google-genai` | Gemini LLM + embeddings |
| ChromaDB | Vector database for RAG |
| Motor | Async MongoDB driver |
| PyPDF | PDF text extraction |
| Pillow | Image processing |
| structlog | Structured JSON logging |
| slowapi | Rate limiting |
| python-jose | JWT tokens |

---

## 📁 Project Structure

```
bhavvi-ai-assistant/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── chat/            # Chat interface components
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── layout/          # App shell, sidebar, topbar
│   │   │   └── upload/          # File upload components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page-level components
│   │   ├── router/              # React Router configuration
│   │   ├── services/            # Axios API service layer
│   │   ├── store/               # Zustand state stores
│   │   └── theme/               # MUI theme configuration
│   └── public/
│
├── backend/                     # FastAPI backend
│   ├── agents/                  # LangGraph agent definitions
│   │   ├── graph.py             # StateGraph wiring
│   │   ├── planner.py           # Routing agent
│   │   ├── general_agent.py
│   │   ├── vision_agent.py
│   │   ├── rag_agent.py
│   │   ├── memory_agent.py
│   │   └── response_agent.py
│   ├── api/                     # FastAPI route handlers
│   ├── config/                  # App configuration
│   ├── core/                    # Database client, logging
│   ├── memory/                  # Conversation memory utilities
│   ├── middleware/              # CORS, rate limiting, error handling
│   ├── models/                  # Pydantic + MongoDB data models
│   ├── rag/                     # RAG pipeline (embeddings, chunker, retriever)
│   ├── schemas/                 # Request/response Pydantic schemas
│   ├── services/                # Business logic services
│   ├── tests/                   # pytest test suite
│   ├── uploads/                 # Temporary file storage
│   ├── utils/                   # Shared utilities
│   └── vectorstore/             # ChromaDB client
│
└── docs/                        # Project documentation
```

---

## ⚙️ Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB Atlas account (free tier works)
- Google AI Studio API key (Gemini 2.5 access)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/bhavvi-ai-assistant.git
cd bhavvi-ai-assistant
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your API keys
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local      # Set VITE_API_URL
npm run dev
```

The app will be running at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

---

## 🚀 Deployment

| Service | Platform | Guide |
|---|---|---|
| Frontend | Vercel | [docs/deployment.md#vercel](docs/deployment.md#vercel) |
| Backend | Render | [docs/deployment.md#render](docs/deployment.md#render) |
| Database | MongoDB Atlas | [docs/deployment.md#mongodb](docs/deployment.md#mongodb) |
| Vector DB | ChromaDB (in-process) | Bundled with backend |

---

## 📖 Documentation

- [Architecture Deep-Dive](docs/architecture.md)
- [API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Developer Guide](docs/developer_guide.md)

---

## 🎓 Academic Context

This project was developed as a **Final-Year Engineering Capstone Project** demonstrating:

- Multi-agent AI system design with LangGraph
- Retrieval-Augmented Generation (RAG) pipelines
- Multimodal AI (text + vision)
- Production-quality full-stack engineering
- Modern React UI/UX patterns
- Clean architecture and SOLID principles

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Bhavvi AI Assistant</strong> · Built with ❤️ as a capstone engineering project
</div>

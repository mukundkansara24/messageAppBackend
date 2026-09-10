# AGENTS.md — Instructions for AI Assistants

## Project Overview
- **Description:** This is backend of message app. Message App is use to send and receive message from one user to other.
- **Tech Stack:** Node.js , Express, MongoDB/Mongoose, MySQL, socket.IO, Redis
- **Architecture:** REST API backend with MVC structure

---


## Code Style & Conventions

### Guiding Principle: KISS (Keep It Simple, Stupid)
- Always prefer the simplest solution that correctly solves the problem — avoid over-engineering, unnecessary abstraction layers, or premature optimization.
- Do not add configurability, generalization, or extra flexibility that isn't currently needed ("YAGNI" — You Aren't Gonna Need It).
- Prefer straightforward, readable code over clever one-liners or complex patterns.
- If a simple `if/else` or plain function does the job, don't reach for a design pattern, factory, or extra abstraction.
- Break large components/functions down, but don't fragment logic into excessive tiny pieces purely for the sake of "modularity" — clarity comes first.
- When in doubt, choose the version of the code a new contributor could understand in under a minute.

### General Rules
- Keep components small and modular in single files.
- Use explicit async/await over raw Promises.

### Naming Conventions
- **Files/Folders:** `PascalCase` for files/folders (e.g., `UserRoute.js`).
- **Variables/Functions:** `camelCase`.
- **Types/Interfaces:** `PascalCase` (e.g., `UserPayload`).

### Error Handling
- Wrap controller logic in explicit `try/catch` blocks or use global async wrapper middleware.
- Return structured JSON responses: `{ success: boolean, message?: string, data?: any }`.

---

## Repository Structure
├── src/
│   ├── models/          # Database schemas / models
│   ├── routes/          # Express route definitions
│   ├── utils/           # Helper functions
│   └── middleware/      # Middlewares

---

### DO:
- Follow existing file patterns and maintain separation between REST logic and Socket.IO events.
- Return appropriate HTTP status codes (e.g., 400, 401, 404, 500) for API responses.

### DON'T:
- Do not introduce new external dependencies without asking first.
- Do not make change in code without asking first.
- Do not read .env file unless explicitly stated.

---
# TitleCodeRefine — AI Code Review Engine

Generative AI–Powered Code Review & Optimization Engine using Flask + Gemini AI.

## Features
- 🐛 **Bug Detection** — Find critical bugs, logic errors, and edge cases
- ⚡ **Performance Optimization** — Identify O(n²) loops, memory leaks, slow patterns
- 🔒 **Security Scanning** — SQL injection, XSS, insecure hashing, and more
- ✦ **Code Rewriting** — AI-powered complete code rewrites with custom instructions
- 📖 **Code Explanation** — Detailed breakdowns, complexity analysis, use cases
- 📊 **Quality Scoring** — 0–100 code quality score with visual meter

## Tech Stack
- **Backend**: Python Flask
- **Frontend**: HTML, CSS, JavaScript
- **AI Engine**: Google Gemini 1.5 Flash
- **Fonts**: JetBrains Mono + Syne

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Get Gemini API Key
- Visit https://aistudio.google.com
- Create a free API key

### 3. Set API Key
**Option A — Environment variable (recommended):**
```bash
export GEMINI_API_KEY="your_key_here"
```

**Option B — Edit app.py directly:**
```python
GEMINI_API_KEY = "your_key_here"
```

### 4. Run the app
```bash
python app.py
```

Open http://localhost:5000 in your browser.

## Project Structure
```
titlecoderefine/
├── app.py                  # Flask backend
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── css/
    │   └── style.css      # Minimalist dark theme
    └── js/
        └── main.js        # Frontend logic
```

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main app UI |
| `/analyze` | POST | Full code analysis |
| `/rewrite` | POST | AI code rewrite |
| `/explain` | POST | Code explanation |

## Supported Languages
Python, JavaScript, TypeScript, Java, C++, C, Go, Rust, PHP, Ruby, Swift, Kotlin

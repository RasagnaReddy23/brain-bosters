from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
import json
import re

app = Flask(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
genai.configure(api_key=GEMINI_API_KEY)

def get_model():
    return genai.GenerativeModel("gemini-1.5-flash")

def analyze_code_with_gemini(code, language, analysis_type):
    model = get_model()
    
    prompts = {
        "full": f"""You are an expert code reviewer. Analyze the following {language} code comprehensively.
Return your analysis as a valid JSON object with this exact structure:
{{
  "summary": "Brief overall assessment (2-3 sentences)",
  "score": <integer 0-100 representing code quality>,
  "bugs": [
    {{"line": <line_number or null>, "severity": "critical|high|medium|low", "description": "Issue description", "fix": "How to fix it"}}
  ],
  "performance": [
    {{"line": <line_number or null>, "impact": "high|medium|low", "description": "Performance issue", "suggestion": "Optimization suggestion"}}
  ],
  "security": [
    {{"line": <line_number or null>, "severity": "critical|high|medium|low", "description": "Security vulnerability", "fix": "How to fix it"}}
  ],
  "best_practices": [
    {{"description": "Best practice violation", "suggestion": "Recommended approach"}}
  ],
  "optimized_code": "Complete optimized version of the code with all fixes applied",
  "improvements_summary": ["List of key improvements made in optimized code"]
}}

Code to analyze:
```{language}
{code}
```

Return ONLY valid JSON, no markdown, no explanation outside the JSON.""",

        "bugs": f"""Analyze this {language} code for bugs only.
Return valid JSON:
{{
  "summary": "Bug analysis summary",
  "score": <integer 0-100>,
  "bugs": [
    {{"line": <number or null>, "severity": "critical|high|medium|low", "description": "Bug description", "fix": "Fix suggestion"}}
  ],
  "performance": [],
  "security": [],
  "best_practices": [],
  "optimized_code": "Bug-fixed version of the code",
  "improvements_summary": ["Bugs fixed"]
}}

Code:
```{language}
{code}
```
Return ONLY valid JSON.""",

        "performance": f"""Analyze this {language} code for performance issues only.
Return valid JSON:
{{
  "summary": "Performance analysis summary",
  "score": <integer 0-100>,
  "bugs": [],
  "performance": [
    {{"line": <number or null>, "impact": "high|medium|low", "description": "Performance issue", "suggestion": "Optimization"}}
  ],
  "security": [],
  "best_practices": [],
  "optimized_code": "Performance-optimized version of the code",
  "improvements_summary": ["Performance improvements"]
}}

Code:
```{language}
{code}
```
Return ONLY valid JSON.""",

        "security": f"""Analyze this {language} code for security vulnerabilities only.
Return valid JSON:
{{
  "summary": "Security analysis summary",
  "score": <integer 0-100>,
  "bugs": [],
  "performance": [],
  "security": [
    {{"line": <number or null>, "severity": "critical|high|medium|low", "description": "Vulnerability", "fix": "Fix"}}
  ],
  "best_practices": [],
  "optimized_code": "Security-hardened version of the code",
  "improvements_summary": ["Security improvements"]
}}

Code:
```{language}
{code}
```
Return ONLY valid JSON."""
    }

    prompt = prompts.get(analysis_type, prompts["full"])
    
    response = model.generate_content(prompt)
    text = response.text.strip()
    
    # Strip markdown code fences if present
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()
    
    return json.loads(text)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    code = data.get("code", "").strip()
    language = data.get("language", "python")
    analysis_type = data.get("analysis_type", "full")
    
    if not code:
        return jsonify({"error": "No code provided"}), 400
    
    if len(code) > 50000:
        return jsonify({"error": "Code too large. Max 50,000 characters."}), 400

    try:
        result = analyze_code_with_gemini(code, language, analysis_type)
        return jsonify({"success": True, "result": result})
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Failed to parse AI response: {str(e)}"}), 500
    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg.upper() or "api key" in error_msg.lower():
            return jsonify({"error": "Invalid or missing Gemini API key. Please configure your API key."}), 401
        return jsonify({"error": f"Analysis failed: {error_msg}"}), 500

@app.route("/rewrite", methods=["POST"])
def rewrite():
    data = request.get_json()
    code = data.get("code", "").strip()
    language = data.get("language", "python")
    instructions = data.get("instructions", "")
    
    if not code:
        return jsonify({"error": "No code provided"}), 400

    try:
        model = get_model()
        prompt = f"""Rewrite the following {language} code based on these instructions: {instructions if instructions else 'Apply all best practices, fix bugs, optimize performance, and improve readability'}.

Return ONLY a JSON object:
{{
  "rewritten_code": "The complete rewritten code",
  "changes": ["List of changes made"]
}}

Original code:
```{language}
{code}
```

Return ONLY valid JSON, no markdown."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        
        result = json.loads(text)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"error": f"Rewrite failed: {str(e)}"}), 500

@app.route("/explain", methods=["POST"])
def explain():
    data = request.get_json()
    code = data.get("code", "").strip()
    language = data.get("language", "python")
    
    if not code:
        return jsonify({"error": "No code provided"}), 400

    try:
        model = get_model()
        prompt = f"""Explain the following {language} code in detail.

Return ONLY a JSON object:
{{
  "overview": "High-level explanation of what this code does",
  "breakdown": [
    {{"section": "Section name or line range", "explanation": "What this section does"}}
  ],
  "complexity": "Time and space complexity analysis",
  "use_cases": ["Potential use cases for this code"]
}}

Code:
```{language}
{code}
```

Return ONLY valid JSON."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        
        result = json.loads(text)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"error": f"Explanation failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

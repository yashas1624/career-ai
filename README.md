# AI Career Counselor & Skill Gap Analyzer

A sleek, vanilla JS web application that acts as an AI-powered career counselor. This tool accurately maps career paths, analyzes your skill gaps, and generates a personalized, step-by-step learning roadmap natively formatted as a continuous visual flow chart. 

## Features
- **Intelligent Career Chat:** Converse directly with an AI counselor to identify career options based on your skills, experience, and background.
- **Skill Gap Analysis:** Generates an exhaustive skill-mapping assessment containing your current skill level vs required levels, prioritizing missing skills.
- **Personalized Roadmap Flowcharts:** An exclusive learning roadmap generator that outputs a continuous Kanban-style flowchart outlining resources, duration, and milestones for each phase.
- **Pure Vanilla JS & CSS:** No React, No NextJS, No Build Steps! Extremely fast, relying solely on CSS Glassmorphism syntax and `fetch()`.

## Setup & Running Locally
Since this is a vanilla HTML/JS/CSS app, there is no complicated build environment. 

1. Clone or extract the repository folder.
2. Open `app.js` and add your OpenAI-compatible API key (such as Together AI, Groq, or OpenAI) directly to the `state.apiKey` variable at the top.
3. Run a local web server inside the directory. You can use Python's built-in module:
   ```bash
   python -m http.server 8080
   ```
4. Open your browser and navigate to `http://localhost:8080/`.

## Architecture
- `index.html`: The HTML application shell.
- `style.css`: Contains CSS variables, Glassmorphism components, SVG particle animations, and the horizontal unified flowchart layout configurations.
- `app.js`: API context engine, state management, and HTML flowchart dynamic templating functions.

# 🏛️ LLM Council

A Streamlit app that answers your questions by convening a **council of LLMs**.
Instead of trusting a single model, several models each answer independently,
then rank one another's *anonymized* answers, and a designated **Chairman**
model synthesizes the council's collective wisdom into one final reply.

This is a self-contained Streamlit port of Andrej Karpathy's
[llm-council](https://github.com/karpathy/llm-council). All models are called
through the [OpenRouter](https://openrouter.ai) API, so a single API key gives
you access to models from OpenAI, Google, Anthropic, xAI, and more.

## How it works

The council deliberates in three stages:

1. **Individual responses** — every council model answers your question in
   parallel.
2. **Peer rankings** — each model receives the other answers with the authors
   hidden (`Response A`, `Response B`, …) and ranks them best-to-worst. Because
   the answers are anonymized, models can't play favorites with their own
   provider. Rankings are aggregated into a leaderboard.
3. **Chairman synthesis** — the Chairman model reads every response and every
   ranking, then writes the final answer shown at the top of the reply.

The final answer is displayed first; the full deliberation (individual
responses, per-model evaluations, and the aggregate leaderboard) is available in
the collapsible **Council deliberation** panel.

## Configuration

Council members and the Chairman are defined in [`config.py`](config.py):

```python
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4",
]
CHAIRMAN_MODEL = "google/gemini-3-pro-preview"
```

Any model available on OpenRouter can be substituted.

## Setup

1. Install the requirements:

   ```
   $ pip install -r requirements.txt
   ```

2. Provide your OpenRouter API key one of two ways:

   - **Environment variable:**

     ```
     $ export OPENROUTER_API_KEY="sk-or-v1-..."
     ```

   - **Streamlit secrets:** copy `.streamlit/secrets.toml.example` to
     `.streamlit/secrets.toml` and fill in your key. (This file is
     git-ignored.)

3. Run the app:

   ```
   $ streamlit run streamlit_app.py
   ```

## Project structure

| File               | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `streamlit_app.py` | Streamlit UI: chat interface, deliberation panel, leaderboard. |
| `council.py`       | 3-stage orchestration + OpenRouter client (parallelized).      |
| `config.py`        | Council/Chairman model list and API-key resolution.            |

## Credits

Council concept and prompts adapted from
[karpathy/llm-council](https://github.com/karpathy/llm-council).

# 📄 Unlimited-OCR (Streamlit)

A Streamlit front end for Baidu's
[**Unlimited-OCR**](https://huggingface.co/baidu/Unlimited-OCR) — a
vision-language model for "one-shot long-horizon" document parsing. Upload an
image or a multi-page PDF and get back clean, structured Markdown.

The OCR model is large and needs a CUDA GPU, so this app **does not load the
model locally**. Instead it calls the model's hosted Gradio Space
([`baidu/Unlimited-OCR`](https://huggingface.co/spaces/baidu/Unlimited-OCR))
through `gradio_client`. That keeps this app GPU-free, so it runs anywhere
Streamlit runs (including Streamlit Community Cloud).

## How it works

1. You upload an image or PDF.
2. PDFs are rasterized to page images locally with **PyMuPDF** (CPU only).
3. Each page image is sent to the Space's streaming `/run_ocr` endpoint, and the
   parsed text streams into the UI as the model generates it.
4. All pages are concatenated into a single downloadable Markdown document.

Two model modes are available:

- **Gundam** — 640px crop, faster (default).
- **Base** — 1024px, more accurate on dense pages.

## Setup

1. Install the requirements:

   ```
   $ pip install -r requirements.txt
   ```

2. (Recommended) Provide a Hugging Face token. The hosted model runs on
   **ZeroGPU**, which rate-limits anonymous callers, so a token makes runs
   reliable. Set it either way:

   - Environment variable:

     ```
     $ export HF_TOKEN="hf_..."
     ```

   - Streamlit secrets: copy `.streamlit/secrets.toml.example` to
     `.streamlit/secrets.toml` and fill in your token (git-ignored).

   Create a token at <https://huggingface.co/settings/tokens>.

3. Run the app:

   ```
   $ streamlit run streamlit_app.py
   ```

> The **first** request may take up to a minute while the Space wakes from
> sleep. Subsequent requests are fast.

## Configuration

The sidebar's **Advanced** section lets you change the hosted endpoint at
runtime — useful if the official Space is busy and you want to point at a fork,
or a different `api_name`. Defaults live in [`ocr_client.py`](ocr_client.py):

```python
DEFAULT_SPACE_ID = "baidu/Unlimited-OCR"
DEFAULT_API_NAME = "/run_ocr"
```

## Project structure

| File               | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `streamlit_app.py` | Streamlit UI: upload, streaming results, per-page progress, export. |
| `ocr_client.py`    | `gradio_client` wrapper for the hosted Space + PDF rasterization.   |

## Credits

Model and hosted Space by Baidu:
[baidu/Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR). Built on
DeepSeek-OCR.

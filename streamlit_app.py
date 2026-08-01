"""Unlimited-OCR — a Streamlit front end for Baidu's Unlimited-OCR model.

Upload an image or PDF and get parsed text (Markdown) back. The heavy
vision-language model runs on Hugging Face's hosted Gradio Space
(https://huggingface.co/spaces/baidu/Unlimited-OCR) — this app is a thin,
GPU-free client, so it deploys anywhere Streamlit runs.
"""

import os
import tempfile

import streamlit as st

from ocr_client import (
    DEFAULT_API_NAME,
    DEFAULT_PROMPT,
    DEFAULT_SPACE_ID,
    MODES,
    OCRConfig,
    OCRError,
    build_client,
    get_hf_token,
    ocr_image_stream,
    pdf_to_images,
)

st.set_page_config(page_title="Unlimited-OCR", page_icon="📄", layout="wide")

IMAGE_TYPES = ["png", "jpg", "jpeg", "webp", "bmp", "tiff"]


def save_upload(uploaded) -> str:
    """Persist an uploaded file to a temp path and return it."""
    suffix = os.path.splitext(uploaded.name)[1] or ".bin"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(uploaded.getbuffer())
    tmp.close()
    return tmp.name


@st.cache_resource(show_spinner=False)
def get_client(space_id: str, api_name: str, hf_token: str | None):
    """Cache one gradio_client per (space, token) so we don't reconnect."""
    return build_client(OCRConfig(space_id=space_id, api_name=api_name, hf_token=hf_token))


# --------------------------------------------------------------------------- #
# Sidebar — configuration
# --------------------------------------------------------------------------- #
with st.sidebar:
    st.header("📄 Unlimited-OCR")
    st.caption(
        "One-shot long-horizon document parsing, powered by "
        "[baidu/Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR)."
    )

    mode_key = st.radio(
        "Model mode",
        options=list(MODES.keys()),
        format_func=lambda k: MODES[k],
        help="Gundam is faster; Base is more accurate on dense pages.",
    )
    prompt = st.text_input("Prompt", value=DEFAULT_PROMPT)

    with st.expander("Advanced"):
        space_id = st.text_input("Hugging Face Space", value=DEFAULT_SPACE_ID)
        api_name = st.text_input("API endpoint", value=DEFAULT_API_NAME)
        pdf_dpi = st.slider("PDF render DPI", 100, 300, 200, step=50)

    token = get_hf_token()
    if token:
        st.success("Hugging Face token detected.")
    else:
        st.warning(
            "No Hugging Face token found. The hosted model runs on ZeroGPU — "
            "set `HF_TOKEN` (env var or `.streamlit/secrets.toml`) to avoid "
            "rate limits. Get one at https://huggingface.co/settings/tokens."
        )
    st.caption("The first request can take a minute while the Space warms up.")


# --------------------------------------------------------------------------- #
# Main — input
# --------------------------------------------------------------------------- #
st.title("📄 Unlimited-OCR")
st.write("Extract text and structure from images and PDFs.")

uploaded = st.file_uploader(
    "Upload an image or PDF",
    type=IMAGE_TYPES + ["pdf"],
    accept_multiple_files=False,
)

run = st.button("🔍 Run OCR", type="primary", disabled=uploaded is None)

if run and uploaded is not None:
    is_pdf = uploaded.name.lower().endswith(".pdf")
    input_path = save_upload(uploaded)

    col_preview, col_result = st.columns(2)

    with col_preview:
        st.subheader("Input")
        if is_pdf:
            st.info(f"PDF: {uploaded.name}")
        else:
            st.image(input_path, use_container_width=True)

    with col_result:
        st.subheader("Parsed text")
        output_area = st.empty()

    try:
        client = get_client(space_id, api_name, token)
    except OCRError as exc:
        st.error(str(exc))
        st.stop()

    # Build the list of page image paths to OCR.
    try:
        if is_pdf:
            with st.status("Rendering PDF pages…", expanded=False):
                page_paths = pdf_to_images(input_path, dpi=pdf_dpi)
        else:
            page_paths = [input_path]
    except OCRError as exc:
        st.error(str(exc))
        st.stop()

    full_text_parts: list[str] = []
    total = len(page_paths)
    progress = st.progress(0.0)

    try:
        for page_idx, path in enumerate(page_paths):
            header = f"\n\n---\n\n## Page {page_idx + 1}\n\n" if total > 1 else ""
            page_text = ""
            with st.status(
                f"OCR page {page_idx + 1} of {total}…", expanded=False
            ) as status:
                for partial in ocr_image_stream(
                    client, path, mode_key, prompt, api_name
                ):
                    page_text = partial
                    combined = "".join(full_text_parts) + header + page_text
                    output_area.markdown(combined)
                status.update(state="complete")
            full_text_parts.append(header + page_text)
            progress.progress((page_idx + 1) / total)
    except OCRError as exc:
        st.error(str(exc))
        st.stop()

    final_text = "".join(full_text_parts).strip()
    progress.empty()

    if final_text:
        output_area.markdown(final_text)
        st.download_button(
            "⬇️ Download Markdown",
            data=final_text,
            file_name=f"{os.path.splitext(uploaded.name)[0]}.md",
            mime="text/markdown",
        )
        with st.expander("Raw text"):
            st.code(final_text, language="markdown")
    else:
        st.warning("No text was returned. Try the other model mode or a clearer scan.")

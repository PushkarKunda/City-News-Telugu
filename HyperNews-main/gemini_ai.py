import google.generativeai as genai
import json
import logging
import re
import os

logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

_model = None


def get_gemini_model():
    global _model
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY must be set")
    if _model is None:
        _model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    return _model


def extract_image_url(text: str) -> str:
    """
    Extracts the first image URL (ending with .jpg, .jpeg, .png, .webp, etc.) from the given text.
    """
    match = re.search(r'(https?://\S+\.(?:jpg|jpeg|png|webp))', text)
    return match.group(1) if match else ""


def call_gemini_api(content: str) -> dict:
    prompt = f"""
    Generate a short news headline and a 3-4 line summary in the style of Inshorts.
    Content:
    {content}

    Return only JSON format:
    {{
      "title": "...",
      "summary": "...",
      "language": "en"
    }}
    """
    try:
        response = get_gemini_model().generate_content(prompt)
        text = response.text.strip()

        json_match = re.search(r'{.*}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())

        return {"title": "", "summary": "", "language": ""}
    except Exception as e:
        logger.exception("Gemini API error")
        return {"title": "", "summary": "", "language": ""}


def call_gemini_api_telugu(article_text: str) -> dict:
    prompt = f"""
    మీరు ప్రొఫెషనల్ తెలుగులో వార్తా రచయిత. ఈ కింది ఆంగ్ల కథనాన్ని తెలుగులో “Inshorts” శైలిలో 1 ఆకర్షణీయమైన శీర్షిక మరియు 3-5 లైన్ల సారాంశంగా మలచండి.

    కథనం:
    {article_text}

    ఫలితాన్ని కేవలం ఈ JSON ఫార్మాట్‌లో ఇవ్వండి:

    {{
      "title": "తెలుగులో ఆకర్షణీయమైన శీర్షిక",
      "summary": "తెలుగులో 3-5 లైన్ల సారాంశం",
      "language": "te"
    }}

    ఇతర అక్షరాలు లేదా వివరణలు అవసరం లేదు.
    """
    try:
        response = get_gemini_model().generate_content(prompt)
        text = response.text.strip()

        # Attempt to extract JSON from the response
        json_match = re.search(r'{.*}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())

        # If not matched properly
        logger.warning("Invalid JSON format from Gemini response")
        return {"title": "", "summary": "", "language": ""}
    except Exception as e:
        logger.exception("Gemini Telugu API error")
        return {"title": "", "summary": "", "language": ""}
    
    


# def call_gemini_api_english(article_text: str) -> dict:
#     """
#     Generate short English news (title + summary + suggested categories).
#     """
#     if not article_text or len(article_text.strip()) < 50:
#         return {"title": "", "summary": "", "language": "en", "categories": []}

#     prompt = f"""
#     You are a professional English news summarizer like Inshorts.

#     Task:
#     - Detect the input language and translate to English if needed.
#     - Create a catchy headline (max 12 words).
#     - Create a concise 3–5 line summary (50–70 words).
#     - Suggest 1–2 suitable news categories (e.g., Politics, Sports, Technology, Business, Entertainment, World, Health, Science, Lifestyle).
#     - Keep tone factual, neutral, and crisp.

#     Article:
#     {article_text}

#     Return strictly in JSON:
#     {{
#       "title": "short english title",
#       "summary": "short summary in english",
#       "language": "en",
#       "categories": ["Category1", "Category2"]
#     }}
#     """

#     try:
#         response = model.generate_content(prompt)
#         text = response.text.strip()

#         json_match = re.search(r'{.*}', text, re.DOTALL)
#         if json_match:
#             return json.loads(json_match.group())

#         return {"title": "", "summary": "", "language": "en", "categories": []}
#     except Exception as e:
#         print("Gemini English API error:", e)
#         return {"title": "", "summary": "", "language": "en", "categories": []}
def call_gemini_api_english(article_text: str) -> dict:
    if not article_text or len(article_text.strip()) < 50:
        return {"title": "", "summary": "", "language": "en", "categories": []}

    prompt = f"""
    You are a professional English news summarizer like Inshorts.

    Task:
    - Detect the input language and translate to English if needed.
    - Create a catchy headline (max 12 words).
    - Create a concise 3–5 line summary (50–70 words).
    - Suggest 1–2 suitable news categories (e.g., Politics, Sports, Technology, Business, Entertainment, World, Health, Science, Lifestyle).
    - Keep tone factual, neutral, and crisp.

    Article:
    {article_text}

    Return strictly in JSON:
    {{
      "title": "short english title",
      "summary": "short summary in english",
      "language": "en",
      "categories": ["Category1", "Category2"]
    }}
    """

    try:
        response = get_gemini_model().generate_content(prompt)
        text = response.text.strip()
        logger.debug("Gemini raw response: %s", text)

        json_match = re.search(r'{.*}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())

        logger.warning("No valid JSON found in Gemini response.")
        return {"title": "", "summary": "", "language": "en", "categories": []}

    except Exception as e:
        logger.exception("Gemini English API error")
        return {"title": "", "summary": "", "language": "en", "categories": []}

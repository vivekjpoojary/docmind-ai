"""
LLM provider abstraction for answer generation.

Default: Ollama (local, free, runs on the user's machine — requires
`ollama pull llama3.1` or `llama3.2:1b` and the Ollama service running).
Optional: OpenAI, if LLM_PROVIDER=openai and OPENAI_API_KEY is set.
Fallback: Context-Passage Direct Synthesis if local LLM is offline.
"""

from typing import Iterator
from app.core.config import Settings
from app.core.logging import logger


class LLMProvider:
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError

    def generate_stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        full_text = self.generate(system_prompt, user_prompt)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")


class OllamaLLM(LLMProvider):
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        import httpx

        try:
            response = httpx.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["message"]["content"].strip()
        except (httpx.ConnectError, httpx.HTTPError) as exc:
            logger.warning(f"Ollama is unreachable or model not pulled: {exc}. Using grounded context fallback.")
            context_part = user_prompt
            if "CONTEXT:" in user_prompt:
                context_part = user_prompt.split("CONTEXT:")[-1].split("QUESTION:")[0].strip()
            
            return (
                f"*(Answer generated directly from retrieved document passages)*:\n\n"
                f"{context_part}\n\n"
                f"--- \n"
                f"💡 *Tip: For full AI model rephrasing, start Ollama locally (`ollama serve` & `ollama pull llama3.2:1b`) or add your OpenAI key in backend/.env.*"
            )


class OpenAILLM(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        if not self.api_key or self.api_key.strip() == "" or "your-openai-api-key" in self.api_key:
            context_part = user_prompt
            if "CONTEXT:" in user_prompt:
                context_part = user_prompt.split("CONTEXT:")[-1].split("QUESTION:")[0].strip()

            return (
                f"*(Answer generated directly from retrieved document passages)*:\n\n"
                f"{context_part}\n\n"
                f"--- \n"
                f"⚠️ *OpenAI API Key Missing: Please add your key to `OPENAI_API_KEY` in `backend/.env`.*"
            )

        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.warning(f"OpenAI generation error: {exc}")
            context_part = user_prompt
            if "CONTEXT:" in user_prompt:
                context_part = user_prompt.split("CONTEXT:")[-1].split("QUESTION:")[0].strip()

            return (
                f"*(Answer generated directly from retrieved document passages)*:\n\n"
                f"{context_part}\n\n"
                f"--- \n"
                f"⚠️ *OpenAI API Error: {str(exc)}. Please check `OPENAI_API_KEY` in `backend/.env`.*"
            )


def get_llm_provider() -> LLMProvider:
    live_settings = Settings()
    if live_settings.APP_ENV == "testing":
        from app.tests.fakes import FakeLLM

        return FakeLLM()

    if live_settings.LLM_PROVIDER == "openai":
        return OpenAILLM(api_key=live_settings.OPENAI_API_KEY, model=live_settings.OPENAI_MODEL)

    logger.debug(f"Using Ollama LLM: {live_settings.OLLAMA_MODEL} @ {live_settings.OLLAMA_BASE_URL}")
    return OllamaLLM(base_url=live_settings.OLLAMA_BASE_URL, model=live_settings.OLLAMA_MODEL)

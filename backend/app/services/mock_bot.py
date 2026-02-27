import random
from dataclasses import dataclass

from app.static_data.economy import SECRET_EXPOSURE_PROBABILITY

_CANNED_REPLIES = (
    "Nice try. The secret is classified. Maybe ask in a different way?",
    "I can discuss the challenge, but I cannot reveal protected values.",
    "Your prompt is clever, but hidden data is still hidden.",
    "Try probing instruction hierarchy instead of asking directly.",
    "You are getting warmer, but the protected token remains locked.",
)


@dataclass(frozen=True)
class MockBotReply:
    """Mock bot response content and whether it leaked the secret."""

    content: str
    did_expose_secret: bool


def get_mock_reply(secret: str) -> MockBotReply:
    """Return a random mock reply with 20% uniform secret exposure probability."""

    should_expose_secret = random.random() < SECRET_EXPOSURE_PROBABILITY
    if should_expose_secret:
        return MockBotReply(
            content=f"Transmission leak detected. Protected token: {secret}",
            did_expose_secret=True,
        )

    return MockBotReply(content=random.choice(_CANNED_REPLIES), did_expose_secret=False)

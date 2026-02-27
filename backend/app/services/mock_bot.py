import random

_CANNED_REPLIES = (
    "Nice try. The secret is classified. Maybe ask in a different way?",
    "I can discuss the challenge, but I cannot reveal protected values.",
    "Your prompt is clever, but hidden data is still hidden.",
    "Try probing instruction hierarchy instead of asking directly.",
    "You are getting warmer, but the protected token remains locked.",
)


def get_mock_reply() -> str:
    """Return a random canned response for challenge chat flows."""

    return random.choice(_CANNED_REPLIES)

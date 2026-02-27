from enum import Enum


class TimezoneEnum(Enum):
    """Stable timezone ids for example local development data."""

    UTC = 1
    EUROPE_AMSTERDAM = 2
    AMERICA_NEW_YORK = 3

    @property
    def timezone_name(self) -> str:
        """Return the canonical timezone string stored in the database."""

        mapping = {
            TimezoneEnum.UTC: "UTC",
            TimezoneEnum.EUROPE_AMSTERDAM: "Europe/Amsterdam",
            TimezoneEnum.AMERICA_NEW_YORK: "America/New_York",
        }
        return mapping[self]

    @classmethod
    def from_name(cls, name: str) -> "TimezoneEnum":
        """Map a canonical timezone string to a stable enum member."""

        for member in cls:
            if member.timezone_name == name:
                return member
        raise ValueError(f"Timezone '{name}' not supported")

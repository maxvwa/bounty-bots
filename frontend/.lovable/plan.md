

# Bounty Bots – Prompt Injection Challenge Platform

## Overview
A webapp where users try to trick AI agents into leaking secrets via prompt injection. Features a landing page with bot challenges and a chat interface for attacks.

## Pages & Features

### 1. Landing Page – Bot Gallery
- Hero section with tagline: "Break the Bots. Earn the Bounty."
- Brief explanation of how it works (3-step: Pick a bot → Attack → Win the bounty)
- Grid of bot challenge cards, each showing:
  - Bot avatar/illustration (themed to its role, e.g. 🏦 Bank Teller, 🔬 Scientist, 🕵️ Secret Agent)
  - Bot name & role description
  - Current bounty payout (increases with failed attempts)
  - Difficulty badge (Free, Easy, Medium, Hard)
  - Number of attempts made
  - "Attack" button
- One bot marked as **FREE** to try, others show credit cost per attempt

### 2. Chat / Attack Interface
- Opens when user clicks "Attack" on a bot
- Chat window styled like a terminal/hacker aesthetic
- Shows the bot's role context at top (e.g. "You are chatting with BankBot – a bank teller guarding an API key")
- Message input for the user's prompt injection attempts
- Each message deducts 1 credit (shown in UI)
- Bot responds with mock replies (for now, random plausible responses)
- Random chance of success – when triggered, confetti/celebration animation, bounty payout displayed
- Credit balance shown in header

### 3. Mock Data & Simulation
- 6 sample bots with different roles, secrets, difficulty levels, and bounty amounts
- Fake credit system (start with 10 credits, free bot costs 0)
- Bot replies with canned responses; ~10% random chance of "leaking" the secret
- On success: show the leaked secret, bounty amount won, and victory screen

### Design Direction
- Dark theme with neon/cyber aesthetic (green accents on dark background)
- Hacker/terminal-inspired typography
- Smooth animations on card hover and chat messages


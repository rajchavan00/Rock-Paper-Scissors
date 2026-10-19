<div align="center">

# Rock Paper Scissors — The Program

**A polished, responsive Rock Paper Scissors game with a pattern-aware computer opponent, pass-and-play multiplayer, match statistics, and synthesized sound.**

[Features](#-features) · [Preview](#-preview) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Tests](#-tests)

</div>

---

## 🎮 Overview

**The Program** turns the classic Rock Paper Scissors game into a complete browser experience. Play against a computer opponent that adapts to repeated habits, or challenge a friend on the same device. Choose a best-of-3, best-of-5, or best-of-7 match and track your record over time.

Built with **HTML, CSS, and vanilla JavaScript**. No build step, package installation, or framework is required.

## ✨ Features

- **Two game modes:** play against the computer or use pass-and-play for two people on one device.
- **Pattern-aware computer opponent:** combines randomness with signals from recent and repeated gestures.
- **Configurable match lengths:** best of 3, 5, or 7.
- **Tie replay:** tied rounds do not advance the round counter.
- **Persistent player record:** matches, wins, losses, ties, current streak, best streak, and gesture preferences are saved in `localStorage`.
- **Round history:** review the gestures and outcomes from previous rounds.
- **Keyboard controls:** press `1` for Rock, `2` for Paper, or `3` for Scissors.
- **Synthesized sound effects:** feedback is generated with the Web Audio API; no audio files are needed.
- **Responsive layout:** the arena and stats panel adapt to smaller screens.
- **Accessibility details:** labelled controls, visible focus states, an announcement region for results, and reduced-motion support.

## 🖼️ Preview

![Illustrative interface preview](screenshots/interface-preview.svg)

> This is an illustrative interface preview, not a browser screenshot. Replace it with a real screenshot of the running game when preparing the final repository presentation.

Suggested screenshot set:
- `screenshots/gameplay.png` — main arena during a match
- `screenshots/friend-mode.png` — pass-and-play screen
- `screenshots/match-results.png` — completed match and record

To add real screenshots, capture the app in your browser, save the images in `screenshots/`, then embed them here using Markdown, for example: `![Gameplay](screenshots/gameplay.png)`.

## 🧰 Tech Stack

| Technology | Purpose |
| --- | --- |
| HTML5 | Semantic page structure and SVG icons |
| CSS3 | Responsive layout, design tokens, animation, and visual states |
| JavaScript (ES6+) | Game flow, opponent logic, scoring, and statistics |
| Web Audio API | Synthesized game sounds |
| `localStorage` | Persistent match record |
| Node.js | Runs the headless test scripts |

## 🚀 Getting Started

### Requirements

- A modern browser (Chrome, Edge, Firefox, or Safari)
- Node.js, only if you want to run the test scripts

### Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/<your-repository>.git
   cd <your-repository>
   ```

2. Start a local static server from the project root:

   ```bash
   python -m http.server 8000
   ```

3. Open [http://localhost:8000](http://localhost:8000) in your browser.

You can also open `index.html` directly. Running through a local server is recommended for consistent browser storage behavior.

## 🕹️ How to Play

1. Open the game and choose **The House** or **Friend** mode.
2. Select the match length.
3. Choose Rock, Paper, or Scissors. You can also use the `1`, `2`, and `3` keys.
4. In Friend mode, Player 1 chooses first; pass the device to Player 2 when prompted.
5. Win enough rounds to reach the match target. Ties can be replayed.
6. Your match record is saved in the browser.

**Rules:** Rock beats Scissors, Scissors beats Paper, and Paper beats Rock.

## 🗂️ Project Structure

```text
.
├── index.html                 # Main page and SVG icon sprite
├── assets/
│   ├── css/
│   │   └── styles.css          # Design system, responsive styling, animations
│   └── js/
│       ├── app.js              # Game controller and match flow
│       ├── audio.js            # Web Audio API sound effects
│       └── house.js            # Computer opponent logic
├── screenshots/
│   └── interface-preview.svg   # Illustrative UI preview
├── test/
│   ├── logic.test.js           # Computer mode and match-flow tests
│   └── friend.test.js          # Pass-and-play tests
└── README.md
```

## 🧪 Tests

Run the included headless tests from the project root:

```bash
node test/logic.test.js
node test/friend.test.js
```

The test scripts use a lightweight DOM stub and do not require a browser window. They cover opponent choices, scoring, verdicts, match flow, and pass-and-play behavior.

## ♿ Accessibility

The interface includes accessible control names, keyboard-operable controls, visible focus indicators, a live result announcement, and reduced-motion handling. Color is supplemented by text labels so outcomes are not communicated by color alone.

## 🛠️ Implementation Notes

- The opponent combines a random baseline with weighted responses to frequently used and recent gestures. It is designed to be beatable, not unbeatable.
- Match records use the local storage key `rps.record.v1`.
- Google Fonts are used for the intended typography; fallback fonts keep the interface usable if those fonts are unavailable.
- This is a front-end browser project. Match records are stored locally in the current browser and are not synced between devices.

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Make and test your changes.
4. Commit: `git commit -m "Add: your feature"`.
5. Push the branch and open a pull request.

## 📄 License

No license file was included with the supplied project files. Add a `LICENSE` file and select a license before describing this project as open source.

---

<div align="center">
Made with HTML, CSS, and JavaScript.
</div>

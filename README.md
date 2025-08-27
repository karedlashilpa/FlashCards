# FlashCards (Voice-Enabled)

A browser-based educational flashcard game that uses the Web Speech API for interactive math and vocabulary learning. Practice mental math, U.S. state capitals, chemical symbols, and Spanish vocabulary using your voice. Includes a 60-second challenge timer, scoring, and high-score persistence per category.

Project license: MIT (see LICENSE)

Links (from original project):
- GitHub Project: https://github.com/iambrandonn/FlashCards
- Blog Post: http://tripleequals.blogspot.com/2013/02/the-new-web-speech-api-flash-cards.html
- Author on Twitter: https://twitter.com/NichollsBrandon


## App Overview and Purpose

- Voice-first learning: Answer by speaking; the app listens and evaluates your responses in real time.
- Multiple categories:
  - Built-in: Addition, Subtraction, Multiplication, Division, US State Capitals, Chemical Symbols, Spanish Vocabulary
  - Custom: Add your own categories with question/answer pairs.
- Challenge mode: 60-second timer to answer as many as possible.
- Scores: Live score and stored high score for each category.
- Multi-language recognition: Choose the recognition language that best matches your spoken language/accent.


## Supported Browsers and Speech Input Requirements

The app relies on the Web Speech API (SpeechRecognition). Support is best in:
- Google Chrome (desktop) — recommended
- Chromium-based browsers with Web Speech support
- Other browsers may work if they expose `window.SpeechRecognition` (or vendor-prefixed variants like `webkitSpeechRecognition`)

Microphone access:
- You must allow the browser to access your microphone when prompted.
- Some browsers only enable the Web Speech API over HTTPS or localhost.
- If speech recognition is not supported or permission is denied, the app will display a warning and the voice game mode will not run.

Performance notes:
- The 60-second round uses continuous recognition (`continuous = true`) and interim results to show what the app “hears” in real time.
- Network conditions and device microphone quality can impact recognition accuracy.


## How to Play

1. Open index.html in a compatible browser (or host the `FlashCards` folder on a static server).
2. Choose a category:
   - Click on a category in the left panel.
   - The Start button will enable after a selection.
3. Select the recognition language (optional):
   - In the Timer and Controls panel, choose a language from the dropdown that best matches how you’ll speak your answers (default is your browser language, falls back to en-US).
4. Click Start:
   - The browser will request microphone permission (first time).
   - The game reveals your first problem and starts the 60-second timer.
5. Answer by speaking:
   - Say the answer out loud. For example, if the card shows “4 + 4”, say “eight” or “8”.
   - For vocabulary/questions like “Alabama”, say the correct answer (“Montgomery”).
   - If you get stuck, say “skip” (the app also accepts “next question”).
6. Scoring:
   - Each correctly answered card increases your score by 1.
   - The app immediately shows the next problem after a correct answer or when you say “skip”.
7. End of round:
   - The round ends after 60 seconds (a chime plays).
   - Your high score for the selected category is updated and persisted locally if you beat your previous best.
   - Click Restart to play again.

Tips for best accuracy:
- Pick the recognition language that matches your accent/words (e.g., Spanish vocabulary may work better with Spanish locale; you can still try English if you prefer).
- Speak clearly and avoid background noise.
- Use short, direct answers matching the expected answer (e.g., just “eighteen”, not “the answer is eighteen”).


## Adding and Managing Custom Categories

You can create your own flashcard categories from the app UI:

1. Go to “Add more...”:
   - From the left panel on the main page, click “Add more...” to navigate to the Category editor.
2. Create a category:
   - Enter a category name (e.g., “My Capitals”).
   - Add at least two question/answer pairs.
   - Press Save.
3. Edit an existing category:
   - On the category editor page, choose a category from the list.
   - Modify questions/answers and Save.
4. Delete a category:
   - Open the category in the editor.
   - Click “Delete this category”.
   - Confirm the deletion. This removes the category and its questions from local storage.

Storage and persistence:
- Categories are stored in the browser’s localStorage:
  - The list of custom category names is stored under the key `categories`.
  - Each category’s questions are stored under a key equal to the category name.
- The app uses safe access helpers and will gracefully continue if localStorage is unavailable (e.g., blocked or disabled), but your changes will not persist in that case.

Data format for a custom category (stored as JSON):
- Each category key holds an array of objects with `{ key: "Question text", value: "Answer text" }`.


## Scoring, High Scores, and Persistence

- Score:
  - Starts at 0 each round.
  - +1 for each correct answer (string answers are case-insensitive).
  - The score display highlights when you surpass your current high score.
- High Score:
  - Tracked per selected category.
  - Persisted in localStorage under the key `<categoryName>HighScore`.
  - Updated at the end of the round if current score is greater than the stored high score.
- No server required:
  - All persistence uses localStorage only on the device/browser you’re using.
  - Clearing site data or disabling storage will remove/highlighted scores and custom categories.


## Accessibility

This app includes incremental accessibility improvements:

- Semantics and ARIA:
  - Category list uses `role="listbox"` and items use `role="option"` with `aria-selected`.
  - Live regions announce status, scores, and heard speech (`aria-live="polite"`).
  - Controls are grouped and labeled; timer canvas includes `role="img"` and an accessible label.
  - Forms for adding/editing categories include proper labels (screen-reader only where needed).
- Keyboard support:
  - Category items are keyboard focusable (`tabindex="0"`) and can be activated with Enter/Space.
  - Start button syncs `aria-disabled` and `disabled` attributes with visual state.
- Visual considerations:
  - Clear focus and selected states.
  - Legible color contrast for key elements.

Known limitations:
- The game is voice-first; there is no full non-voice answer mode. If speech recognition is unsupported, the core game loop won’t run (you can still manage categories).
- The timer visualization is a canvas element; the remaining time is also available as text for screen readers.


## Configuration and Deployment Notes

- No build step required:
  - Static assets only. Open `index.html` or serve the folder with any static server.
- HTTPS recommended:
  - Some browsers require HTTPS or localhost for microphone access and Web Speech features.
- LocalStorage:
  - Ensure storage is enabled. If blocked, custom categories and high scores won’t persist.
- Files of interest:
  - index.html: Main UI
  - main.js: Core game logic (timer, scoring, recognition handling)
  - common.js: Category rendering, safe storage helpers, high score helpers
  - addEditList.html / addEdit.js: Category editor UI and logic
  - sampleProblems.js: Built-in problem sets (capitals, chemistry, Spanish)
  - categories.html / categories.js and question.html / question.js: Handlebars templates (compiled and runtime)
  - common.css / index.css / addEdit.css: Styles


## Troubleshooting

- “Your browser doesn’t support speech recognition”:
  - Try the latest version of Google Chrome (desktop).
  - Ensure you are serving over HTTPS or running from localhost if required by the browser.
- The browser keeps asking for mic permission or can’t hear me:
  - Check OS-level microphone privacy settings.
  - Verify your default input device and mic volume.
- Recognition language seems off:
  - Choose a different language/locale in the dropdown to better match your accent or the vocabulary set.
- High score didn’t save:
  - Check that localStorage is enabled and not in private mode or blocked.
  - Some privacy extensions or enterprise policies may prevent storage writes.


## Contributing

- This project is a static web app; contributions can focus on:
  - Accessibility and keyboard navigation
  - Additional built-in categories or sample sets
  - Configurable game lengths and scoring
  - Non-voice fallback modes for greater accessibility
- Please open issues/PRs on the GitHub project noted above.

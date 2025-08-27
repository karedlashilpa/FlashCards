/*global Handlebars, common, samples */
var SpeechRecognition = window.mozSpeechRecognition ||
	window.msSpeechRecognition ||
	window.oSpeechRecognition ||
	window.webkitSpeechRecognition ||
	window.SpeechRecognition;

var currentProblem;
/**
 * Stores the last rendered answer options for the current card.
 * For math cards: array of numbers as strings. For vocab cards: array of strings.
 */
var currentOptions = [];
var currentScore = 0;
var highScore = 0;
var timerCtx = document.getElementById('cnvTimer').getContext('2d');
var timerCanvasHeight = document.getElementById('cnvTimer').height;
var beginTime;
var errorOccurred = false;
var selectedCategory = 'builtin-addition';
var problemsForSelectedCategory;
var selectedLanguage = navigator.language;

function selectLanguage(newValue) {
	var dropdown = document.getElementsByClassName('languageSelector')[0];
    for(var i = 0; i < dropdown.options.length; i++) {
        if(dropdown.options[i].value === newValue) {
           dropdown.selectedIndex = i;
           return;
        }
    }

    if (newValue.length === 2) {
		for(i = 0; i < dropdown.options.length; i++) {
			if(dropdown.options[i].value.substring(0, 2) === newValue) {
				dropdown.selectedIndex = i;
				return;
			}
		}
    }

    // Default to US english if not found
    selectedLanguage = 'en-US';
    selectLanguage(selectedLanguage);
}

function getQuestionFromList(theList) {
	var index = getRandomInteger(theList.length) - 1;
	return theList[index];
}

function generateAdditionProblem() {
	var first = getRandomInteger(10);
	var second = getRandomInteger(10);
	return {
		firstNumber: first,
		secondNumber: second,
		value: first + second
	};
}

function generateSubtractionProblem() {
	var prob = generateAdditionProblem();
	var first = prob.value;
	var second = prob.firstNumber;
	return {
		firstNumber: first,
		secondNumber: second,
		value: prob.secondNumber
	};
}

function generateMultiplicationProblem() {
	var first = getRandomInteger(10);
	var second = getRandomInteger(10);
	return {
		firstNumber: first,
		secondNumber: second,
		value: first * second
	};
}

function generateDivisionProblem() {
	var prob = generateMultiplicationProblem();
	var first = prob.value;
	var second = prob.firstNumber;
	return {
		firstNumber: first,
		secondNumber: second,
		value: prob.secondNumber
	};
}

function getRandomInteger(ceiling) {
	return Math.floor(Math.random() * ceiling + 1);
}

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Builds a set of answer options for the current problem.
 * - For math: returns numeric strings including the right answer and plausible distractors.
 * - For vocab/list-based: returns strings with the correct value and sampled distractors.
 */
function buildAnswerOptions(category, problem, desiredCount) {
	var options = [];
	var correct = problem.value;
	var count = desiredCount || 4;

	function shuffle(arr) {
		for (var i = arr.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
		}
		return arr;
	}

	// Normalize correct value to string for comparisons
	var correctStr = (typeof correct === 'number') ? ('' + correct) : ('' + correct);

	if (category.indexOf('builtin-') === 0) {
		// Math categories: fabricate nearby numeric distractors
		if (category === 'builtin-addition' || category === 'builtin-subtraction' || category === 'builtin-multiplication' || category === 'builtin-division') {
			var base = (typeof correct === 'number') ? correct : parseFloat(correct);
			var pool = new Set();
			pool.add('' + base);
			// Create up to 8 candidates around base
			for (var d = -6; d <= 6; d++) {
				if (d === 0) continue;
				pool.add('' + (base + d));
			}
			// Some random alternatives
			for (var k = 0; k < 6; k++) {
				pool.add('' + (base + randInt(-12, 12)));
			}
			options = Array.from(pool);
			options = shuffle(options).slice(0, Math.max(count - 1, 1)); // take some distractors first
			// Ensure we include correct answer
			if (options.indexOf('' + base) === -1) {
				options[options.length - 1] = '' + base;
			}
			options.push('' + base);
			options = shuffle(options).slice(0, count);
			return options;
		}

		// Built-in non-math: pick from corresponding sample set values
		var poolList = null;
		if (category === 'builtin-capitals') poolList = samples.capitals;
		else if (category === 'builtin-chemSymbols') poolList = samples.chemSymbols;
		else if (category === 'builtin-spanish') poolList = samples.spanishWords;

		if (poolList && poolList.length) {
			var values = poolList.map(function (p) { return '' + p.value; });
			var unique = Array.from(new Set(values));
			unique = unique.filter(function (v) { return v.toLowerCase() !== ('' + correct).toLowerCase(); });
			unique = shuffle(unique).slice(0, Math.max(count - 1, 1));
			unique.push(correctStr);
			return shuffle(unique);
		}
	}

	// Custom categories: sample values from the category list
	var customList = window.problemsForSelectedCategory || [];
	if (Array.isArray(customList) && customList.length > 0) {
		var vals = customList.map(function (p) { return '' + p.value; });
		var uniqVals = Array.from(new Set(vals)).filter(function (v) {
			return v.toLowerCase() !== ('' + correct).toLowerCase();
		});
		var take = shuffle(uniqVals).slice(0, Math.max(count - 1, 1));
		take.push(correctStr);
		return shuffle(take);
	}

	// Fallback: only correct
	return [correctStr];
}

/**
 * Renders clickable answer option buttons and wires click handlers.
 */
function renderAnswerOptions(options, correctValue) {
	currentOptions = options.slice();
	var container = document.getElementById('answerOptions');
	if (!container) return;

	// Clear previous
	container.innerHTML = '';

	// Render "open-ended" entry for custom text (optional UX)
	// Keep simple: rely on provided options; we can add open-ended later if needed.

	options.forEach(function (opt) {
		var btn = document.createElement('button');
		btn.className = 'answerOptionBtn';
		btn.type = 'button';
		btn.setAttribute('aria-label', 'Answer option: ' + opt);
		btn.textContent = opt;
		btn.addEventListener('click', function () {
			processClickedAnswer(opt, correctValue);
		});
		container.appendChild(btn);
	});
}

/**
 * Handles a clicked answer: marks correctness, updates score, and advances problem if correct.
 */
function processClickedAnswer(selected, correctValue) {
	var correctStr = ('' + (typeof correctValue === 'number' ? correctValue : correctValue)).toLowerCase();
	var chosenStr = ('' + selected).toLowerCase();

	var container = document.getElementById('answerOptions');
	if (!container) return;

	// Mark buttons
	var buttons = container.getElementsByClassName('answerOptionBtn');
	for (var i = 0; i < buttons.length; i++) {
		var btn = buttons[i];
		var val = ('' + btn.textContent).toLowerCase();
		// Indicate correct one
		if (val === correctStr) {
			btn.classList.add('correct');
		}
		// Indicate chosen wrong
		if (val === chosenStr && val !== correctStr) {
			btn.classList.add('incorrect');
		}
		// Disable further clicks
		btn.disabled = true;
	}

	// If correct, increment score and move to next problem after brief delay
	if (chosenStr === correctStr) {
		currentScore++;
		var scoreElement = document.getElementById('currentScoreValue');
		scoreElement.textContent = currentScore;
		if (currentScore > highScore) {
			scoreElement.classList.add('highlight');
		}
		setTimeout(function () {
			showNextProblem();
		}, 350);
	}
}

function showNextProblem() {
	var problemText;
	var previousProblem = currentProblem;
	while (previousProblem === currentProblem) {
		switch (selectedCategory) {
			case 'builtin-addition':
				currentProblem = generateAdditionProblem();
				problemText = currentProblem.firstNumber + ' + ' + currentProblem.secondNumber;
				break;
			case 'builtin-subtraction':
				currentProblem = generateSubtractionProblem();
				problemText = currentProblem.firstNumber + ' - ' + currentProblem.secondNumber;
				break;
			case 'builtin-multiplication':
				currentProblem = generateMultiplicationProblem();
				problemText = currentProblem.firstNumber + ' x ' + currentProblem.secondNumber;
				break;
			case 'builtin-division':
				currentProblem = generateDivisionProblem();
				problemText = currentProblem.firstNumber + ' / ' + currentProblem.secondNumber;
				break;
			case 'builtin-capitals':
				currentProblem = getQuestionFromList(samples.capitals);
				problemText = currentProblem.key;
				break;
			case 'builtin-chemSymbols':
				currentProblem = getQuestionFromList(samples.chemSymbols);
				problemText = currentProblem.key;
				break;
			case 'builtin-spanish':
				currentProblem = getQuestionFromList(samples.spanishWords);
				problemText = currentProblem.key;
				break;
			default:
				currentProblem = getQuestionFromList(window.problemsForSelectedCategory);
				problemText = currentProblem.key;
				break;
		}
	}
	document.getElementsByClassName('problem')[0].textContent = problemText;

	// Build and render options for this problem
	var opts = buildAnswerOptions(selectedCategory, currentProblem, 4);
	renderAnswerOptions(opts, currentProblem.value);
}

function startSpeechRecognition() {
	var currentTime = 60;
	var timer;
	var speech = new SpeechRecognition();
	speech.continuous = true;
	speech.interimResults = true;
	speech.lang = selectedLanguage;
	speech.onstart = function() {
		// Run for 60 seconds and stop
		setTimeout(function() {
			speech.stop();
		}, 60000);

		document.getElementsByClassName('scores')[0].classList.remove('hidden');
		document.getElementsByClassName('card')[0].classList.remove('hidden');
		document.getElementsByClassName('iHeard')[0].classList.remove('hidden');
		document.getElementById('secondInstructions').style.display = '';

		errorOccurred = false;
		currentScore = 0;
		document.getElementById('currentScoreValue').textContent = currentScore;
		beginTime = new Date().getTime();
		window.requestAnimationFrame(updateTimer);

		var timeRemaining = document.getElementsByClassName('timeRemaining')[0];
		timeRemaining.textContent = '1:00';
		timeRemaining.classList.remove('expired');

		timer = setInterval(function() {
			var timeToShow = '';
			if (currentTime > 59) {
				timeToShow = '1:00';
			}
			if (currentTime < 10) {
				timeToShow = '0:0' + currentTime;
			}
			else {
				timeToShow = '0:' + currentTime;
			}

			currentTime--;

			timeRemaining.textContent = timeToShow;
		}, 1000);

		// Show the first question
		showNextProblem();
	};


	speech.onend = function() {
		currentTime = 60;
		clearInterval(timer);
		var timeRemaining = document.getElementsByClassName('timeRemaining')[0];
		timeRemaining.textContent = '1:00';
		timeRemaining.classList.add('expired');
		doneSound.play();
		errorOccurred = true;
		startButton.textContent = 'Restart';

		var previousHigh = common.getHighScoreFor(selectedCategory);
		if (previousHigh < currentScore) {
			common.setHighScoreFor(selectedCategory, currentScore);
			common.renderCategories();
			document.getElementById('highScoreValue').innerHTML = currentScore;
		}

		var highlighted = document.getElementsByClassName('highlight');
		for (var i = 0; i < highlighted.length; i++) {
			highlighted[i].classList.remove('highlight');
		}
	};

	speech.onerror = speech.onend;

	speech.onresult = function(event) {
		var iHeard = '';

		for (var i = event.resultIndex; i < event.results.length; i++) {
			if (!event.results[i].isFinal) {
				iHeard += event.results[i][0].transcript;
			}
		}
		setIHeardText(iHeard);
		checkAnswer(iHeard);
	};

	speech.start();
}

function checkAnswer(guess) {
	var trimmedGuess = (guess || '').trim().toLowerCase();
	var answer = currentProblem && currentProblem.value;
	var answerLower = ('' + (typeof answer === 'string' ? answer : '' + answer)).toLowerCase();

	// Allow "skip" or "next question" to advance without scoring
	if (/skip|next question/gi.test(guess)) {
		showNextProblem();
		return;
	}

	// If user's spoken text contains the answer, count as correct and advance
	if (trimmedGuess.indexOf(answerLower) >= 0 && answerLower.length > 0) {
		currentScore++;
		var scoreElement = document.getElementById('currentScoreValue');
		scoreElement.textContent = currentScore;

		if (currentScore > highScore) {
			scoreElement.classList.add('highlight');
		}
		showNextProblem();
	}
}

function setIHeardText(textToDisplay) {
	document.getElementById('iHeardText').textContent = textToDisplay;
}

function paintTimer(percent) {
	timerCtx.clearRect(0, 0, 1000, 1000);
	var radiusToUse = (timerCanvasHeight / 2) - 5;
	var grd = timerCtx.createRadialGradient(radiusToUse + 5,radiusToUse + 5, (radiusToUse - 15), radiusToUse - 5, radiusToUse - 5,(radiusToUse) + 10);
	grd.addColorStop(0,'rgb(' + Math.ceil(255 - (255 * percent)) + ', ' + Math.ceil(255 * percent) + ', 0)');
	grd.addColorStop(1,"black");

	// Fill with gradient
	timerCtx.fillStyle = grd;
	timerCtx.lineWidth = 4;
	timerCtx.beginPath();
	timerCtx.arc(radiusToUse + 5, radiusToUse + 5, radiusToUse, Math.PI * 3 / 2, Math.PI * 2 * percent - (Math.PI / 2), false);
	timerCtx.lineTo(radiusToUse + 5, radiusToUse + 5);
	timerCtx.closePath();
	timerCtx.stroke();
	timerCtx.fill();
}

function updateTimer() {
	if (errorOccurred) {
		return;
	}

	var now = new Date().getTime();
	var percent = (now - beginTime) / 60000;
	paintTimer(1 - percent);
	if (percent < 1) {
		window.requestAnimationFrame(updateTimer);
	}
}

function detectIfSpeechSupported() {
	var supportMessage;
	var warningsElement = document.getElementsByClassName('warnings')[0];
	if (SpeechRecognition) {
		supportMessage = "Cool!  Your browser supports speech recognition.  Have fun!";
	}
	else {
		warningsElement.classList.add('unsupported');
		supportMessage = "Sorry... Your browser doesn't support speech recognition yet.  Try Google Chrome version 25.";
	}
	warningsElement.innerHTML = supportMessage;
}

function switchToSecondInstructions() {
	var first = document.getElementById('firstInstructions');
	if (first.style.display !== 'none') {
		document.getElementById('secondInstructions').style.display = 'block';
		first.style.display = 'none';
	}
}

detectIfSpeechSupported();
common.renderCategories();
paintTimer(0.99999);
selectLanguage(selectedLanguage);

setTimeout(function() {
	document.getElementsByClassName('leftArrow')[0].style['margin-left'] ='0';
	setTimeout(function() {
		document.getElementsByClassName('leftArrow')[0].style['opacity'] ='0';
		document.getElementById('categoryComponent').style['box-shadow'] ='0 0 0 rgb(0, 115, 121)';
	}, 1500);
}, 300);

var startButton = document.getElementsByClassName('startButton')[0];
startButton.addEventListener('click', function() {
	if (this.classList.contains('disabled')) {
		window.alert('Please choose a category');
		return ;
	}

	startSpeechRecognition();
});

var languageSelector = document.getElementsByClassName('languageSelector')[0];
languageSelector.addEventListener('change', function() {
	selectedLanguage = languageSelector.options[languageSelector.selectedIndex].value;
});

var doneSound = new Audio('done.mp3');

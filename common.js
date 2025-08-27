 /*global Handlebars */

// Wrap storage access in safe helpers to handle browsers with disabled storage or quota errors.
function safeGetItem(key) {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			return window.localStorage.getItem(key);
		}
	} catch (e) {
		// ignore and fall through
	}
	return null;
}

function safeSetItem(key, value) {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.setItem(key, value);
			return true;
		}
	} catch (e) {
		// ignore write failures
	}
	return false;
}

var common = {
	getHighScoreFor: function(category) {
		// Return numeric high score; fallback to 0 if storage unavailable or invalid.
		var scoreStr = safeGetItem(category + 'HighScore');
		if (scoreStr == null) {
			return 0;
		}
		var scoreNum = parseInt(scoreStr, 10);
		return isNaN(scoreNum) ? 0 : scoreNum;
	},

	setHighScoreFor: function(category, score) {
		// Ignore failures silently—game should continue without persistence.
		safeSetItem(category + 'HighScore', String(score));
	},

	renderCategories: function(excludeBuiltin, clickCallback) {
		var categories;
		if (excludeBuiltin) {
			categories = [];
		}
		else {
			categories = [
				{
					name: 'builtin-addition',
					displayName: 'Addition'
				},
				{
					name: 'builtin-subtraction',
					displayName: 'Subtraction'
				},
				{
					name: 'builtin-multiplication',
					displayName: 'Multiplication'
				},
				{
					name: 'builtin-division',
					displayName: 'Division'
				},
				{
					name: 'builtin-capitals',
					displayName: 'US State Capitals'
				},
				{
					name: 'builtin-chemSymbols',
					displayName: 'Chemical Symbols'
				},
				{
					name: 'builtin-spanish',
					displayName: 'Spanish Vocabulary'
				}
			];
		}

		common.addCustomCategories(categories);
		var categoriesHtml = Handlebars.templates['categories.html']({
			categories: categories
		});

		var listEl = document.getElementsByClassName('categoryList')[0];
		listEl.setAttribute('role', 'listbox');
		listEl.setAttribute('aria-label', listEl.getAttribute('aria-label') || 'Flashcard categories');
		listEl.innerHTML = categoriesHtml;

		var categoryElements = document.getElementsByClassName('category');
		for (var i = 0; i < categoryElements.length; i++) {
			// add ARIA roles and keyboard accessibility
			categoryElements[i].setAttribute('role', 'option');
			categoryElements[i].setAttribute('tabindex', '0');
			if (!categoryElements[i].hasAttribute('aria-selected')) {
				categoryElements[i].setAttribute('aria-selected', 'false');
			}

			if (clickCallback) {
				categoryElements[i].addEventListener('click', clickCallback);
			}
			else {
				categoryElements[i].addEventListener('click', common.categoryChanged);
			}

			categoryElements[i].addEventListener('keydown', function(e){
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					this.click();
				}
			});
		}
	},

	addCustomCategories: function(arrayToAddTo) {
		// Safely read categories list and parse JSON
		var problemsAsString = safeGetItem('categories');
		if (!problemsAsString) {
			return;
		}
		var categoryArray = [];
		try {
			categoryArray = JSON.parse(problemsAsString) || [];
		} catch (e) {
			categoryArray = [];
		}
		categoryArray.forEach(function(categoryName) {
			arrayToAddTo.push({
				name: categoryName,
				displayName: categoryName
			});
		});
	},

	categoryChanged: function() {
		if (window.switchToSecondInstructions) {
			window.switchToSecondInstructions();
		}

		var startBtn = document.getElementsByClassName('startButton')[0];
		if (startBtn) {
			startBtn.classList.remove('disabled');
			startBtn.removeAttribute('aria-disabled');
			startBtn.removeAttribute('disabled');
		}

		// update visual and ARIA selected states
		var previouslySelected = document.getElementsByClassName('selected');
		for (var i = 0; i < previouslySelected.length; i++) {
			previouslySelected[i].classList.remove('selected');
			previouslySelected[i].setAttribute('aria-selected', 'false');
		}
		this.classList.add('selected');
		this.setAttribute('aria-selected', 'true');

		window.selectedCategory = this.attributes.name.value;
		// Safely get problems for selected category and parse JSON
		var raw = safeGetItem(window.selectedCategory);
		var parsed = [];
		if (raw) {
			try {
				parsed = JSON.parse(raw) || [];
			} catch (e) {
				parsed = [];
			}
		}
		window.problemsForSelectedCategory = parsed;

		window.highScore = common.getHighScoreFor(window.selectedCategory);
		document.getElementById('highScoreValue').innerHTML = window.highScore;
	}
};

 /*global Handlebars */

var common = {
	getHighScoreFor: function(category) {
		if (localStorage) {
			var score = localStorage.getItem(category + 'HighScore');
			if (score > 0) {
				return score;
			}
			else {
				return 0;
			}
		}

		return 0;
	},

	setHighScoreFor: function(category, score) {
		if (localStorage) {
			localStorage.setItem(category + 'HighScore', score);
		}
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
		var problemsAsString = localStorage.getItem('categories');
		if (problemsAsString) {
			var categoryArray = JSON.parse(problemsAsString);
			categoryArray.forEach(function(categoryName) {
				arrayToAddTo.push({
					name: categoryName,
					displayName: categoryName
				});
			});
		}
	},

	categoryChanged: function() {
		if (window.switchToSecondInstructions) {
			window.switchToSecondInstructions();
		}

		document.getElementsByClassName('startButton')[0].classList.remove('disabled');

		// update visual and ARIA selected states
		var previouslySelected = document.getElementsByClassName('selected');
		for (var i = 0; i < previouslySelected.length; i++) {
			previouslySelected[i].classList.remove('selected');
			previouslySelected[i].setAttribute('aria-selected', 'false');
		}
		this.classList.add('selected');
		this.setAttribute('aria-selected', 'true');

		window.selectedCategory = this.attributes.name.value;
		window.problemsForSelectedCategory = JSON.parse(localStorage.getItem(window.selectedCategory));

		window.highScore = common.getHighScoreFor(window.selectedCategory);
		document.getElementById('highScoreValue').innerHTML = window.highScore;
	}
};

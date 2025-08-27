function getNumQuestions() {
	var count = 0;
	$('.key').each(function(element) {
		if ($(this).val().length > 0) {
			count++;
		}
	});

	return count;
}

// Safe storage helpers to avoid crashes if storage is disabled or blocked
function safeGetItem(key) {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			return window.localStorage.getItem(key);
		}
	} catch (e) {}
	return null;
}
function safeSetItem(key, value) {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.setItem(key, value);
			return true;
		}
	} catch (e) {}
	return false;
}
function safeRemoveItem(key) {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.removeItem(key);
			return true;
		}
	} catch (e) {}
	return false;
}

$('.saveButton').click(function() {
	if (getNumQuestions() < 2) {
		alert('You must provide at least two questions.');
		return;
	}

	var categoryName = $('.categoryName').val();
	if (categoryName.length === 0) {
		$('.categoryName').focus();
		alert('Please provide a category title');
		return;
	}

	// Save the questions for the category safely
	safeSetItem(categoryName, serializeQuestions());

	// Load existing category list safely
	var categoryListRaw = safeGetItem('categories');
	var categoryList = [];
	if (categoryListRaw) {
		try {
			categoryList = JSON.parse(categoryListRaw) || [];
		} catch (e) {
			categoryList = [];
		}
	}

	// See if this list already existed
	var alreadyExists = categoryList.some(function(list) {
		return list === categoryName;
	});

	// Only add it if it didn't exist
	if (!alreadyExists) {
		categoryList.push(categoryName);
		safeSetItem('categories', JSON.stringify(categoryList));
	}

	document.location = 'index.html';
});

$('.deleteButton').click(function() {
	var categoryName = $('.categoryName').val();

	// Confirm with the user before deleting the category and its questions
	var confirmed = window.confirm('Delete the category "' + categoryName + '" and all its questions? This cannot be undone.');
	if (!confirmed) {
		return; // Abort deletion if user cancels
	}

	// Proceed with deletion
	safeRemoveItem(categoryName);

	var categoryListRaw = safeGetItem('categories');
	if (categoryListRaw) {
		var categoryList = [];
		try {
			categoryList = JSON.parse(categoryListRaw) || [];
		} catch (e) {
			categoryList = [];
		}

		categoryList = categoryList.filter(function(theName) {
			return theName !== categoryName;
		});

		safeSetItem('categories', JSON.stringify(categoryList));
	}

	document.location = 'addEditList.html';
});

function checkForNewRowNeeded() {
	// is there an empty row still?
	var lastQuestion = $('.question:last');
	if (lastQuestion.find('.key').val().length > 0 || lastQuestion.find('.value').val().length > 0) {
		// add one
		var newRow = Handlebars.templates['question.html']([{
				key: '',
				value: ''
			}
		]);
		$('.questions').append(newRow);
		$('.question:last > .key, .question:last > .value').focus(checkForNewRowNeeded);
	}
}

function serializeQuestions() {
	var questionSet = [];
	$('.question').each(function(index, question) {
		var questionNode = $(question);
		var key = questionNode.find('.key').val();
		var value = questionNode.find('.value').val();
		if (key && value && key.trim().length > 0 && value.trim().length > 0) {
			questionSet.push({
				key: key,
				value: value
			});
		}
	});

	return JSON.stringify(questionSet);
}

function getListNameFromQueryString() {
	return decodeURI(document.location.search).replace('?category=', '');
}

function categoryClickedCallback() {
	var prev = document.querySelectorAll('.category[aria-selected="true"]');
	for (var i=0;i<prev.length;i++){ prev[i].setAttribute('aria-selected','false'); prev[i].classList.remove('selected'); }
	this.setAttribute('aria-selected','true');
	this.classList.add('selected');
	document.location = 'addEditList.html?category=' + this.innerHTML;
}

var excludeBuiltinCategories = true;
common.renderCategories(excludeBuiltinCategories, categoryClickedCallback);

// Accessibility: keyboard support for categories on this page
(function enhanceCategoryList() {
	function onKeydown(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); } }
	var list = document.getElementsByClassName('categoryList')[0];
	if (!list) return;
	var apply = function(){
		var items = document.getElementsByClassName('category');
		for (var i = 0; i < items.length; i++) {
			items[i].setAttribute('tabindex','0');
			items[i].setAttribute('role','option');
			items[i].addEventListener('keydown', onKeydown);
		}
	};
	apply();
	var obs = new MutationObserver(apply);
	obs.observe(list, {childList:true});
})();

var listToEdit = getListNameFromQueryString();
if (listToEdit.length > 0) {
	$('.deleteButton').show();
	$('.categoryName').val(listToEdit);
	var loadedList = safeGetItem(listToEdit);
	if (loadedList) {
		var loadedListAsObject = [];
		try {
			loadedListAsObject = JSON.parse(loadedList) || [];
		} catch (e) {
			loadedListAsObject = [];
		}
		var nodesToAdd = Handlebars.templates['question.html'](loadedListAsObject);
		$('.header').after(nodesToAdd);
	}
}
else {
	$('.newLink').hide();
}

$('.key, .value').focus(checkForNewRowNeeded);

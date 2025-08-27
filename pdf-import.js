(function () {
  'use strict';

  // PUBLIC_INTERFACE
  function extractTextFromPdf(file) {
    /** Extracts raw text from a PDF file using PDF.js; returns a Promise<string>. */
    return new Promise(function (resolve, reject) {
      if (!file) {
        return reject(new Error('No file provided'));
      }
      const reader = new FileReader();
      reader.onerror = function (e) {
        reject(new Error('Failed to read file'));
      };
      reader.onload = function () {
        const typedarray = new Uint8Array(reader.result);
        // pdfjsLib is provided by the included pdf.js script
        // Configure worker if necessary
        if (window['pdfjsLib'] && window['pdfjsLib'].GlobalWorkerOptions) {
          // When using CDN, worker is auto-resolved, but keep an override just in case.
          // window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        window['pdfjsLib'].getDocument({ data: typedarray }).promise
          .then(async function (doc) {
            const numPages = doc.numPages;
            let fullText = '';
            for (let i = 1; i <= numPages; i++) {
              const page = await doc.getPage(i);
              const content = await page.getTextContent();
              const strings = content.items.map(function (it) { return it.str; });
              fullText += strings.join(' ') + '\n';
            }
            resolve(fullText);
          })
          .catch(function (err) {
            reject(err);
          });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // PUBLIC_INTERFACE
  function parseQuestionsFromText(text) {
    /**
     * Parses Q/A pairs from plain text.
     * Supported patterns:
     *  - Lines beginning with "Q:" then later "A:" on same or next line
     *  - "Question: ... Answer: ..."
     *  - "Question ? Answer" (using question mark as split)
     *  - "Some question - Some answer"
     * Returns Array<{key: string, value: string}>
     */
    if (!text || typeof text !== 'string') {
      return [];
    }

    const lines = text
      .split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; });

    const results = [];

    // Helper to push pair safely
    function addPair(q, a) {
      if (!q || !a) return;
      const key = q.trim();
      const value = a.trim();
      if (key.length > 0 && value.length > 0) {
        results.push({ key: key, value: value });
      }
    }

    // Strategy 1: Scan for "Q:" and "A:" on same line
    lines.forEach(function (l) {
      // Q: ... A: ...
      const qaSameLine = l.match(/(?:^|\s)Q(?:uestion)?\s*[:\-]\s*(.+?)\s+A(?:nswer)?\s*[:\-]\s*(.+)$/i);
      if (qaSameLine) {
        addPair(qaSameLine[1], qaSameLine[2]);
      } else {
        // "Question ? Answer" style
        const qMarkSplit = l.split(/\?\s*-\s*|\?\s*:\s*|\?\s+/);
        if (qMarkSplit.length === 2) {
          const q = l.substring(0, l.indexOf('?') + 1);
          const a = qMarkSplit[1];
          if (/[\w\)]$/.test(q)) {
            addPair(q, a);
          }
        } else {
          // dash-delimited "Question - Answer"
          const dashMatch = l.split(/\s+-\s+|\s+—\s+|\s+–\s+/);
          if (dashMatch.length === 2) {
            // Heuristic: consider first part question if it ends with ? or is longish
            const q = dashMatch[0];
            const a = dashMatch[1];
            if (q.length > 3 && a.length > 0) {
              addPair(q, a);
            }
          }
        }
      }
    });

    // Strategy 2: Multi-line Q: on one line, A: on next line
    for (let i = 0; i < lines.length; i++) {
      const qLine = lines[i];
      const qMatch = qLine.match(/^\s*(?:Q|Question)\s*[:\-]\s*(.+)$/i);
      if (qMatch) {
        // Look ahead for A:
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const aMatch = lines[j].match(/^\s*(?:A|Answer)\s*[:\-]\s*(.+)$/i);
          if (aMatch) {
            addPair(qMatch[1], aMatch[1]);
            i = j; // jump ahead
            break;
          }
        }
      }
    }

    // Deduplicate pairs
    const seen = new Set();
    const unique = [];
    results.forEach(function (p) {
      const key = (p.key + '||' + p.value).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });

    return unique;
  }

  // PUBLIC_INTERFACE
  function createCategoryWithCards(categoryName, cards) {
    /** Persists cards as a category in localStorage and refreshes UI category list. */
    if (!categoryName || !cards || !cards.length) {
      throw new Error('Category name and at least one card required');
    }
    // Save card set
    localStorage.setItem(categoryName, JSON.stringify(cards));

    // Update categories index
    var list = localStorage.getItem('categories');
    var arr = list ? JSON.parse(list) : [];
    if (!arr.some(function (n) { return n === categoryName; })) {
      arr.push(categoryName);
      localStorage.setItem('categories', JSON.stringify(arr));
    }

    // Refresh categories UI if available
    if (window.common && typeof window.common.renderCategories === 'function') {
      window.common.renderCategories();
    }
  }

  // Wire up UI
  document.addEventListener('DOMContentLoaded', function () {
    var fileInput = document.getElementById('pdfInput');
    var processBtn = document.getElementById('processPdfBtn');
    var categoryInput = document.getElementById('pdfCategoryName');
    var status = document.getElementById('pdfStatus');

    if (!fileInput || !processBtn) return;

    function setStatus(msg, isError) {
      if (!status) return;
      status.textContent = msg || '';
      status.style.color = isError ? '#ff5a5f' : '#0b2740';
    }

    processBtn.addEventListener('click', function () {
      try {
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
          setStatus('Please select a PDF file first.', true);
          return;
        }
        var categoryName = (categoryInput && categoryInput.value || '').trim();
        if (!categoryName) {
          var inferred = 'Interview: ' + (file.name || 'PDF').replace(/\.pdf$/i, '');
          categoryName = inferred;
          if (categoryInput) categoryInput.value = inferred;
        }

        setStatus('Reading PDF…');
        extractTextFromPdf(file)
          .then(function (txt) {
            setStatus('Parsing questions…');
            var pairs = parseQuestionsFromText(txt);
            if (!pairs.length) {
              setStatus('No Q/A pairs detected. Please check the format hints above and try another document.', true);
              return;
            }
            createCategoryWithCards(categoryName, pairs);
            setStatus('Created category "' + categoryName + '" with ' + pairs.length + ' cards. Select it from the list to play!');
          })
          .catch(function (err) {
            console.error(err);
            setStatus('Failed to process PDF: ' + (err && err.message ? err.message : 'Unknown error'), true);
          });
      } catch (e) {
        console.error(e);
        setStatus('Error: ' + e.message, true);
      }
    });
  });

  // Expose minimal API for potential reuse
  window.pdfImport = {
    extractTextFromPdf: extractTextFromPdf,
    parseQuestionsFromText: parseQuestionsFromText,
    createCategoryWithCards: createCategoryWithCards
  };
})();

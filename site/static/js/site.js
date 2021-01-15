function debounce(func, wait) {
  var timeout;

  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timeout);

    timeout = setTimeout(function () {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}

function makeTeaser(body, terms) {
  var TERM_WEIGHT = 40;
  var NORMAL_WORD_WEIGHT = 2;
  var FIRST_WORD_WEIGHT = 8;
  var TEASER_MAX_WORDS = 10;

  var stemmedTerms = terms.map(function (w) {
    return elasticlunr.stemmer(w.toLowerCase());
  });
  var termFound = false;
  var index = 0;
  var weighted = [];

  var sentences = body.toLowerCase().split(". ");

  for (var i in sentences) {
    var words = sentences[i].split(" ");
    var value = FIRST_WORD_WEIGHT;

    for (var j in words) {
      var word = words[j];

      if (word.length > 0) {
        for (var k in stemmedTerms) {
          if (elasticlunr.stemmer(word).startsWith(stemmedTerms[k])) {
            value = TERM_WEIGHT;
            termFound = true;
          }
        }
        weighted.push([word, value, index]);
        value = NORMAL_WORD_WEIGHT;
      }

      index += word.length;
      index += 1;
    }

    index += 1;
  }

  if (weighted.length === 0) {
    return body;
  }

  var windowWeights = [];
  var windowSize = Math.min(weighted.length, TEASER_MAX_WORDS);

  var curSum = 0;
  for (var i = 0; i < windowSize; i++) {
    curSum += weighted[i][1];
  }
  windowWeights.push(curSum);

  for (var i = 0; i < weighted.length - windowSize; i++) {
    curSum -= weighted[i][1];
    curSum += weighted[i + windowSize][1];
    windowWeights.push(curSum);
  }

  var maxSumIndex = 0;
  if (termFound) {
    var maxFound = 0;
    for (var i = windowWeights.length - 1; i >= 0; i--) {
      if (windowWeights[i] > maxFound) {
        maxFound = windowWeights[i];
        maxSumIndex = i;
      }
    }
  }

  var teaser = [];
  var startIndex = weighted[maxSumIndex][2];
  for (var i = maxSumIndex; i < maxSumIndex + windowSize; i++) {
    var word = weighted[i];
    if (startIndex < word[2]) {
      teaser.push(body.substring(startIndex, word[2]));
      startIndex = word[2];
    }

    if (word[1] === TERM_WEIGHT) {
      teaser.push("<b>");
    }
    startIndex = word[2] + word[0].length;
    teaser.push(body.substring(word[2], startIndex));

    if (word[1] === TERM_WEIGHT) {
      teaser.push("</b>");
    }
  }
  teaser.push("…");
  return teaser.join("");
}

function formatSearchResultItem(item, terms) {
  return (
    `<article class='box'>` +
    `<h1 class='title'>` +
    `<a class='link' class='link' href='${item.ref}'>${item.doc.title}</a>` +
    `</h1>` +
    `<div class='content mt-2'>` +
    `${makeTeaser(item.doc.body, terms)}` +
    `<a class='read-more' href='${item.ref}'>` +
    `Read More <span class="icon is-small"><i class="fas fa-arrow-right fa-xs"></i></span>` +
    `</a>` +
    `</div>` +
    `</article>`
  );
}

function search() {
  var searchInput = document.getElementById("search");
  var searchResults = document.querySelector(".search-results");
  var searchResultsItems = document.querySelector(".search-results__items");
  var MAX_ITEMS = 10;

  var options = {
    bool: "AND",
    fields: {
      title: { boost: 2 },
      body: { boost: 1 },
    },
  };
  var currentTerm = "";
  var index = elasticlunr.Index.load(window.searchIndex);

  searchInput.addEventListener(
    "keyup",
    debounce(function () {
      var term = searchInput.value.trim();
      if (term === currentTerm || !index) {
        return;
      }
      searchResults.style.display = term === "" ? "none" : "block";
      searchResultsItems.innerHTML = "";
      if (term === "") {
        return;
      }

      var results = index.search(term, options);
      if (results.length === 0) {
        searchResults.style.display = "none";
        return;
      }

      currentTerm = term;
      for (var i = 0; i < Math.min(results.length, MAX_ITEMS); i++) {
        var item = document.createElement("div");
        item.classList.add("mb-4");
        item.innerHTML = formatSearchResultItem(results[i], term.split(" "));
        searchResultsItems.appendChild(item);
      }
    }, 150)
  );
}
document.addEventListener("DOMContentLoaded", function () {
  // mermaid.initialize({ startOnLoad: true });

  if (localStorage.getItem("theme") === "dark") {
    document.querySelector("body").setAttribute("theme", "dark");
  }

  document
    .querySelector(".navbar-burger")
    .addEventListener("click", function () {
      document.querySelector(".navbar-burger").classList.toggle("is-active");
      document.querySelector(".navbar-menu").classList.toggle("is-active");
    });

  const navSearch = document.getElementById("nav-search");
  navSearch.addEventListener("click", function () {
    var target = navSearch.getAttribute("data-target");
    document.querySelector("html").classList.add("is-clipped");
    document.querySelector(target).classList.add("is-active");
    var search = document.querySelector("#search");
    search.focus();
    search.select();
  });

  const modalClose = document.querySelector(".modal-close");
  modalClose.addEventListener("click", function () {
    document.querySelector("html").classList.remove("is-clipped");
    modalClose.parentElement.classList.remove("is-active");
  });

  const modalBackground = document.querySelector(".modal-background");
  modalBackground.addEventListener("click", function () {
    document.querySelector("html").classList.remove("is-clipped");
    modalBackground.parentElement.classList.remove("is-active");
  });

  document.querySelector("#search").addEventListener("keyup", function () {
    search();
  });
  /*
  document.querySelector("#dark-mode").addEventListener("click", function () {
    if (
      localStorage.getItem("theme") == null ||
      localStorage.getItem("theme") == "light"
    ) {
      localStorage.setItem("theme", "dark");

      document.querySelector("body").setAttribute("theme", "dark");

      document
        .querySelector("#dark-mode")
        .setAttribute("title", "Switch to light theme");
    } else {
      localStorage.setItem("theme", "light");

      document.querySelector("body").removeAttribute("theme", "dark");

      document
        .querySelector("#dark-mode")
        .setAttribute("title", "Switch to dark theme");
    }
  });
  */
});

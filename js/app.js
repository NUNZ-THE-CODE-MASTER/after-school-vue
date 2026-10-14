// ============================================================
// CST3144 After-School Classes - Vue.js Front-End
// Framework: Vue 3 (loaded via CDN in index.html)
// Data access: fetch() with Promises (no axios, no XHR)
// ============================================================

// Destructure createApp from the global Vue object provided by the CDN build.
const { createApp } = Vue;

// Create the root Vue application and configure it.
createApp({
  // ----------------------------------------------------------
  // data() returns the reactive state of the app.
  // Every property here is watched by Vue and the UI updates
  // automatically when any of them change.
  // ----------------------------------------------------------
  data: function () {
    return {
      lessons: [],           // Array of lesson objects fetched from the API
      teachers: [],          // Array of teacher objects (for the teacher filter)
      cart: [],              // Items currently in the shopping cart: { lesson, quantity }
      showCart: false,       // Toggle between the lessons page and the cart page
      sortAttribute: "topic",// Which field to sort by: topic, location, price, space
      sortOrder: "asc",      // Sort direction: asc or desc
      searchQuery: "",       // Text typed into the search box
      searchTimer: null,     // Timer handle used to debounce search input
      selectedTeacherId: "",// ID of the teacher chosen in the dropdown ("" = all teachers)
      checkoutName: "",      // Full name entered in the checkout form (first + last)
      checkoutPhone: "",     // Phone number entered in the checkout form (digits only)
      countryCode: "+230",   // Selected country dialling code (e.g. +230 Mauritius)
      checkoutMessage: "",   // Success / error message shown after checkout
      loadError: ""          // Error message shown if the API fails to load
    };
  },

  // ----------------------------------------------------------
  // computed properties are cached values derived from data.
  // They re-evaluate only when their dependencies change.
  // ----------------------------------------------------------
  computed: {
    // Total number of spaces currently in the cart (sum of all quantities).
    cartCount: function () {
      return this.cart.reduce(function (total, item) {
        return total + item.quantity;
      }, 0);
    },

    // Total price of all items in the cart (quantity x price per lesson).
    // Automatically recalculates when items are added or removed.
    cartTotal: function () {
      return this.cart.reduce(function (total, item) {
        return total + item.quantity * item.lesson.price;
      }, 0);
    },

    // Validate the full name:
    // - only letters and spaces allowed
    // - must contain at least two words (first name + last name)
    nameValid: function () {
      const name = this.checkoutName.trim();
      if (!/^[A-Za-z ]+$/.test(name)) {
        return false;
      }
      const words = name.split(/\s+/).filter(function (w) { return w.length > 0; });
      return words.length >= 2;
    },

    // Validate the phone number:
    // - only digits 0-9 allowed (no spaces, dashes, or letters)
    // - must be at least 7 digits long (a real phone number)
    phoneValid: function () {
      const phone = this.checkoutPhone.trim();
      return /^[0-9]{7,}$/.test(phone);
    },

    // The checkout button is only enabled when:
    //   1) the cart has at least one item, AND
    //   2) the name is valid (full name, letters only), AND
    //   3) the phone is valid (digits only, at least 7 digits).
    checkoutEnabled: function () {
      return this.cart.length > 0 && this.nameValid && this.phoneValid;
    },

    // Returns a copy of the lessons array, sorted by the chosen
    // attribute and direction. A copy is made (slice()) so the
    // original array is not mutated.
    sortedLessons: function () {
      const attribute = this.sortAttribute;
      const order = this.sortOrder === "asc" ? 1 : -1;
      return this.lessons.slice().sort(function (a, b) {
        let left = a[attribute];
        let right = b[attribute];
        // String comparison (for topic and location)
        if (typeof left === "string") {
          left = left.toLowerCase();
          right = String(right).toLowerCase();
          if (left < right) {
            return -1 * order;
          }
          if (left > right) {
            return 1 * order;
          }
          return 0;
        }
        // Numeric comparison (for price and space)
        return (Number(left) - Number(right)) * order;
      });
    }
  },

  // ----------------------------------------------------------
  // methods are functions that can be called from the template
  // or from other methods.
  // ----------------------------------------------------------
  methods: {
    // Build the full URL for a lesson image hosted by the Express server.
    imageUrl: function (filename) {
      return API_BASE_URL + "/images/" + filename;
    },

    // Look up a teacher's full name from the teachers array using their ID.
    teacherName: function (teacherId) {
      const teacher = this.teachers.find(function (item) {
        return String(item._id) === String(teacherId);
      });
      if (!teacher) {
        return "Unknown teacher";
      }
      return teacher.firstName + " " + teacher.lastName;
    },

    // --------------------------------------------------------
    // FETCH: GET /lessons
    // Retrieves all lessons from the API (optionally filtered by
    // teacher) and stores them in the reactive `lessons` array.
    // --------------------------------------------------------
    fetchLessons: function () {
      const self = this;
      let url = API_BASE_URL + "/lessons";
      if (this.selectedTeacherId) {
        url += "?teacherId=" + encodeURIComponent(this.selectedTeacherId);
      }
      return fetch(url)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not load lessons");
          }
          return response.json();
        })
        .then(function (data) {
          self.lessons = data;
          self.loadError = "";
          // After loading lessons, fetch the enrolment count for each.
          return self.loadEnrolments();
        })
        .catch(function (err) {
          self.loadError = err.message;
        });
    },

    // --------------------------------------------------------
    // FETCH: GET /teachers
    // Retrieves the list of teachers for the dropdown filter.
    // --------------------------------------------------------
    fetchTeachers: function () {
      const self = this;
      return fetch(API_BASE_URL + "/teachers")
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not load teachers");
          }
          return response.json();
        })
        .then(function (data) {
          self.teachers = data;
        })
        .catch(function (err) {
          self.loadError = err.message;
        });
    },

    // --------------------------------------------------------
    // FETCH: GET /enrolment/:lessonid (CHALLENGE)
    // For each lesson, asks the API how many spaces have already
    // been purchased and stores that number on the lesson object.
    // --------------------------------------------------------
    loadEnrolments: function () {
      const self = this;
      const requests = this.lessons.map(function (lesson) {
        return fetch(API_BASE_URL + "/enrolment/" + lesson._id)
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            lesson.enrolment = data.enrolment;
          })
          .catch(function () {
            lesson.enrolment = 0;
          });
      });
      // Wait for all enrolment requests to finish before resolving.
      return Promise.all(requests);
    },

    // --------------------------------------------------------
    // SEARCH (CHALLENGE)
    // The search runs on the BACK-END via GET /search?q=.
    // `onSearchInput` debounces the typing so the API is not hit
    // on every keystroke (waits 400ms after the user stops typing).
    // --------------------------------------------------------
    onSearchInput: function () {
      const self = this;
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(function () {
        self.runSearch();
      }, 400);
    },

    runSearch: function () {
      const self = this;
      const query = this.searchQuery.trim();
      // If the search box is empty, just load all lessons again.
      if (!query) {
        this.fetchLessons();
        return;
      }
      fetch(API_BASE_URL + "/search?q=" + encodeURIComponent(query))
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Search failed");
          }
          return response.json();
        })
        .then(function (data) {
          // Apply the teacher filter on top of the search results.
          if (self.selectedTeacherId) {
            self.lessons = data.filter(function (lesson) {
              return String(lesson.teacherId) === String(self.selectedTeacherId);
            });
          } else {
            self.lessons = data;
          }
          return self.loadEnrolments();
        })
        .catch(function (err) {
          self.loadError = err.message;
        });
    },

    // When the teacher dropdown changes, reload lessons (or re-run search).
    onTeacherChange: function () {
      if (this.searchQuery.trim()) {
        this.runSearch();
      } else {
        this.fetchLessons();
      }
    },

    // --------------------------------------------------------
    // ADD TO CART
    // Adds one space of the given lesson to the cart and
    // decreases the lesson's available space by one.
    // The button is disabled in the template when space <= 0,
    // but we also guard here for safety.
    // --------------------------------------------------------
    addToCart: function (lesson) {
      if (lesson.space <= 0) {
        return;
      }
      // If this lesson is already in the cart, increase quantity.
      const existing = this.cart.find(function (item) {
        return item.lesson._id === lesson._id;
      });
      if (existing) {
        existing.quantity += 1;
      } else {
        // Otherwise add a new cart entry.
        this.cart.push({
          lesson: lesson,
          quantity: 1
        });
      }
      // Reduce the available space for this lesson.
      lesson.space -= 1;
    },

    // --------------------------------------------------------
    // REMOVE FROM CART
    // Decreases the quantity of a cart item by one and restores
    // one space to the lesson. If quantity reaches zero, the item
    // is removed from the cart entirely.
    // --------------------------------------------------------
    removeFromCart: function (item) {
      item.quantity -= 1;
      item.lesson.space += 1;
      if (item.quantity <= 0) {
        const index = this.cart.indexOf(item);
        this.cart.splice(index, 1);
      }
    },

    // --------------------------------------------------------
    // TOGGLE CART PAGE
    // Switches between the lessons view and the cart view.
    // The cart button is disabled when the cart is empty AND we
    // are on the lessons page (so the user can't open an empty cart).
    // --------------------------------------------------------
    toggleCart: function () {
      if (this.cart.length === 0 && !this.showCart) {
        return;
      }
      this.showCart = !this.showCart;
      this.checkoutMessage = "";
    },

    // --------------------------------------------------------
    // CHECKOUT
    // 1) Validates name (full name, letters) and phone (digits,
    //    min 7 digits) via computed properties; the button is
    //    disabled until both are valid.
    // 2) POSTs the order to /orders (phone includes country code).
    // 3) After the order is saved, PUTs the updated space for each
    //    lesson in the cart.
    // 4) Clears the cart and shows a confirmation message.
    // --------------------------------------------------------
    checkout: function () {
      const self = this;
      // Double-check that checkout is allowed.
      if (!this.checkoutEnabled) {
        return;
      }

      // Build the order object matching the back-end's expected schema.
      // The full phone number includes the selected country dialling code.
      const order = {
        name: this.checkoutName.trim(),
        phone: this.countryCode + this.checkoutPhone.trim(),
        lessons: this.cart.map(function (item) {
          return {
            lessonId: item.lesson._id,
            spaces: item.quantity
          };
        })
      };

      // FETCH: POST /orders - save the new order
      fetch(API_BASE_URL + "/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not save order");
          }
          return response.json();
        })
        .then(function () {
          // FETCH: PUT /lessons/:id - update the remaining space for
          // each lesson in the cart. We send the new (reduced) space value.
          const updates = self.cart.map(function (item) {
            return fetch(API_BASE_URL + "/lessons/" + item.lesson._id, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ space: item.lesson.space })
            }).then(function (response) {
              if (!response.ok) {
                throw new Error("Could not update lesson spaces");
              }
              return response.json();
            });
          });
          // Wait for all PUT requests to complete.
          return Promise.all(updates);
        })
        .then(function () {
          // Success: confirm the order and reset the cart.
          self.checkoutMessage = "Order submitted successfully. Thank you!";
          self.cart = [];
          self.checkoutName = "";
          self.checkoutPhone = "";
        })
        .catch(function (err) {
          self.checkoutMessage = err.message;
        });
    }
  },

  // ----------------------------------------------------------
  // mounted() runs once the Vue app has been attached to the DOM.
  // Here we load the teachers first, then the lessons.
  // ----------------------------------------------------------
  mounted: function () {
    const self = this;
    this.fetchTeachers().then(function () {
      return self.fetchLessons();
    });
  }
}).mount("#app");

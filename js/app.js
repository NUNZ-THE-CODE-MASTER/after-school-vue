const { createApp } = Vue;

createApp({
  data: function () {
    return {
      lessons: [],
      teachers: [],
      cart: [],
      showCart: false,
      sortAttribute: "topic",
      sortOrder: "asc",
      searchQuery: "",
      searchTimer: null,
      selectedTeacherId: "",
      checkoutName: "",
      checkoutPhone: "",
      checkoutMessage: "",
      loadError: ""
    };
  },
  computed: {
    cartCount: function () {
      return this.cart.reduce(function (total, item) {
        return total + item.quantity;
      }, 0);
    },
    nameValid: function () {
      return /^[A-Za-z ]+$/.test(this.checkoutName.trim());
    },
    phoneValid: function () {
      return /^[0-9]+$/.test(this.checkoutPhone.trim());
    },
    checkoutEnabled: function () {
      return this.cart.length > 0 && this.nameValid && this.phoneValid;
    },
    sortedLessons: function () {
      const attribute = this.sortAttribute;
      const order = this.sortOrder === "asc" ? 1 : -1;
      return this.lessons.slice().sort(function (a, b) {
        let left = a[attribute];
        let right = b[attribute];
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
        return (Number(left) - Number(right)) * order;
      });
    }
  },
  methods: {
    imageUrl: function (filename) {
      return API_BASE_URL + "/images/" + filename;
    },
    teacherName: function (teacherId) {
      const teacher = this.teachers.find(function (item) {
        return String(item._id) === String(teacherId);
      });
      if (!teacher) {
        return "Unknown teacher";
      }
      return teacher.firstName + " " + teacher.lastName;
    },
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
          return self.loadEnrolments();
        })
        .catch(function (err) {
          self.loadError = err.message;
        });
    },
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
      return Promise.all(requests);
    },
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
    onTeacherChange: function () {
      if (this.searchQuery.trim()) {
        this.runSearch();
      } else {
        this.fetchLessons();
      }
    },
    addToCart: function (lesson) {
      if (lesson.space <= 0) {
        return;
      }
      const existing = this.cart.find(function (item) {
        return item.lesson._id === lesson._id;
      });
      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.push({
          lesson: lesson,
          quantity: 1
        });
      }
      lesson.space -= 1;
    },
    removeFromCart: function (item) {
      item.quantity -= 1;
      item.lesson.space += 1;
      if (item.quantity <= 0) {
        const index = this.cart.indexOf(item);
        this.cart.splice(index, 1);
      }
    },
    toggleCart: function () {
      if (this.cart.length === 0 && !this.showCart) {
        return;
      }
      this.showCart = !this.showCart;
      this.checkoutMessage = "";
    },
    checkout: function () {
      const self = this;
      if (!this.checkoutEnabled) {
        return;
      }

      const order = {
        name: this.checkoutName.trim(),
        phone: this.checkoutPhone.trim(),
        lessons: this.cart.map(function (item) {
          return {
            lessonId: item.lesson._id,
            spaces: item.quantity
          };
        })
      };

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
          return Promise.all(updates);
        })
        .then(function () {
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
  mounted: function () {
    const self = this;
    this.fetchTeachers().then(function () {
      return self.fetchLessons();
    });
  }
}).mount("#app");

//use strict mode in all scripts
"use strict";

/*

TO DO

1. ability to edit a workout
2. ability to delete a workout
3. ability to delete all workouts
4. ability to sort workouts by a certain field e.g. distance
5. re-build Running and Cycling objects coming from SessionStorage
6. more realistic error and confirmation messages
7. ability to position the map to show all workouts
8. ability to draw lines and shapes instead of just points
9. geocode locations from coordinates (3rd-party API)
10. display weather data for workout time and place (3rd-party API)

*/

// DOM Elements
const elementForm = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

// Project Architecture
// Business logic & UI
class App {
  #map;
  #mapZoom = 16;
  #clickEvent;
  #workouts = [];
  #popupSettings = {
    maxWidth: 250,
    minWidth: 100,
    autoClose: false,
    closeOnClick: false,
    className: "",
  };

  constructor() {
    this._getPosition();
    inputType.addEventListener("change", this._toggleElevationField);
    elementForm.addEventListener("submit", this._newWorkout.bind(this));
    containerWorkouts.addEventListener("click", this._movePosition.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      undefined
    );
  }

  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    this.#map = L.map("map").setView([latitude, longitude], this.#mapZoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      this.#map
    );
    this._getSessionStorage();
    this.#map.on("click", this._showForm.bind(this));
  }

  _showForm(e) {
    this.#clickEvent = e;
    elementForm.classList.remove("hidden");
    inputType.focus();
  }

  _toggleElevationField() {
    inputCadence.parentElement.classList.toggle("form__row--hidden");
    inputElevation.parentElement.classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    const { lat, lng } = this.#clickEvent.latlng;
    if (!this._createWorkout(inputType.value, lat, lng)) {
      this._clearForm();
      return;
    }

    const workout = this.#workouts[this.#workouts.length - 1];
    this._renderWorkout.call(this, workout);
    this._setSessionStorage.call(this);
    this._clearForm();
    this._hideForm();
  }

  _createWorkout(type, lat, lng) {
    const validateInput = (...inputs) =>
      !inputs.some((el) =>
        el !== inputElevation
          ? !Number.isFinite(+el.value) || +el.value <= 0
          : !Number.isFinite(+el.value) || +el.value === 0
      );

    return Boolean(
      validateInput(inputDistance, inputDuration) &&
        ((type === "running" &&
          validateInput(inputCadence) &&
          this.#workouts.push(new Running(lat, lng))) ||
          (type === "cycling" &&
            validateInput(inputElevation) &&
            this.#workouts.push(new Cycling(lat, lng))))
    );
  }

  _renderWorkout(workout) {
    const day = new Date(workout.date).getDate();
    const month = new Date(workout.date).getMonth();
    // prettier-ignore
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // prettier-ignore
    const specs = {
      running: ["&#x1F3C3", Number(workout.pace).toFixed(1), "min/km", "&#x1F9B6", workout.cadence, "spm", "Running"],
      cycling: [ "&#x1F6B4", Number(workout.speed).toFixed(1), "km/h", "&#x26F0", workout.elevationGain, "m", "Cycling"],
    };

    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${specs[workout.type][6]} on ${
      months[month]
    } ${day}</h2>
        <div class="workout__details">
          <span class="workout__icon">${specs[workout.type][0]}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${specs[workout.type][1]}</span>
          <span class="workout__unit">${specs[workout.type][2]}</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${specs[workout.type][3]}</span>
          <span class="workout__value">${specs[workout.type][4]}</span>
          <span class="workout__unit">${specs[workout.type][5]}</span>
        </div>
      </li>
    `;
    elementForm.insertAdjacentHTML("afterend", html);

    this.#popupSettings.className = `${workout.type}-popup`;

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup(this.#popupSettings))
      .setPopupContent(
        `${specs[workout.type][0]} ${specs[workout.type][6]} on ${
          months[month]
        } ${day}`
      )
      .openPopup();
  }

  _movePosition(e) {
    const click = e.target.closest(".workout");

    if (!click) return;

    const workout = this.#workouts.find((el) => el.id === click.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: { duration: 1 },
    });

    // workout.countClick(); < TODO : OOP prototypal chain >
  }

  _clearForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
  }

  _hideForm() {
    elementForm.style.display = "none";
    elementForm.classList.add("hidden");
    setTimeout(() => {
      elementForm.style.display = "grid";
    }, 1000);
  }

  _setSessionStorage() {
    sessionStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getSessionStorage() {
    const data = JSON.parse(sessionStorage.getItem("workouts"));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach((el) => this._renderWorkout.call(this, el));
  }

  _displayTime(time) {
    const setTime = time ? new Date(time) : new Date();

    return setTime.toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  reset() {
    sessionStorage.clear("workouts");
    location.reload();
  }
}

// User stories
class Workout {
  clicks = 0;
  date = new Date().toISOString();
  distance = inputDistance.value;
  duration = inputDuration.value;
  id = String(Date.now()).slice(-10);
  type = inputType.value;

  constructor(coords) {
    this.coords = coords;
  }

  countClick() {
    this.clicks++;
  }
}

class Running extends Workout {
  cadence = inputCadence.value;
  pace = this.duration / this.distance;

  constructor(...coords) {
    super(coords);
  }
}

class Cycling extends Workout {
  elevationGain = inputElevation.value;
  speed = this.distance / (this.duration / 60);

  constructor(...coords) {
    super(coords);
  }
}
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
const app = new App();

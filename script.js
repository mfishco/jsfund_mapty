'use strict';

// prettier-ignore

class Workout {

	date = new Date();
	id = (Date.now() + '').slice(-10);
	clicks = 0;

	constructor(coords, distance, duration) {
		this.coords = coords; // [lat, lng]
		this.distance = distance;  // in km
		this.duration = duration;  // in minutes
	}

	_setDescription() {
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const longMonth =
			new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.date);
		//this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${this.date.getMonth()} ${this.date.getDate()}`;
		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${longMonth} ${this.date.getDate()}`;
	}

	click() {
		this.clicks++;
	}
}

class Running extends Workout {
	type = 'running';
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = Number(cadence);
		this.calcPace();
		this._setDescription();
	}
	calcPace() {
		//min/km
		this.pace = this.duration/this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = 'cycling';
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		//min/km
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}



///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {

	// Private instance properties;
	#map;
	#mapZoomLevel = 13;
	#mapEvent;
	#workouts = [];

constructor() {
		//get users poisition
	    this._getPosition();

		// Attach event handlers
		this._getLocalStorage();

		form.addEventListener('submit', this._newWorkout.bind(this));
		inputType.addEventListener('change', this._toggleElevationField);
		containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
	}

	_getPosition() {
		if(navigator.geolocation)
			navigator.geolocation.getCurrentPosition(
			this._loadMap.bind(this),
			function () {
				alert('Could not get your position.');
			});
	}

	_loadMap(position) {
		const {latitude} = position.coords;
		const {longitude} = position.coords;

		const coords = [latitude, longitude];
		// leaflet
		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
		L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.#map);
		this.#map.on('click', this._showForm.bind(this));

		this.#workouts.forEach(wo => {
			this._renderWorkoutMarker(wo);
		})

	}

	_showForm(_mapEvent) {
		this.#mapEvent = _mapEvent;
		form.classList.remove('hidden');
		inputDistance.focus();
	}

	_hideForm(_mapEvent) {
		inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';
		form.style.display = 'none';
		form.classList.add('hidden');
		setTimeout(() => form.style.display = 'grid', 1000);

	}

	_toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

	}

	_newWorkout(e) {
		const validInputs = (...inputs) =>
			inputs.every(inp =>	Number.isFinite(inp));
		const allPositive = (...inputs) =>
			inputs.every(inp => inp > 0);

		e.preventDefault();

		//get data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const {lat, lng} = this.#mapEvent.latlng;
		let workout;


		// If running, create running obj
		if(type ==='running') {
			const cadence = +inputCadence.value;
			if(
				!validInputs(cadence, distance, duration) ||
				!allPositive(cadence, distance, duration)
			)
				return alert('Inputs have to be positive numbers.');
			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If cycling, create cycling obj
		if(type === 'cycling') {
			const elevation = +inputElevation.value;
			if(
				!validInputs(elevation, distance, duration) ||
				!allPositive(distance, duration)
			)
				return alert('Inputs have to be positive numbers.');
			workout = new Cycling([lat, lng], distance, duration, elevation);
		}
		// Add new obj to obj array
		this.#workouts.push(workout);

		// Render workout on map as marker
		this._renderWorkoutMarker(workout);

		// Render workout on list
		this._renderWorkout(workout);


		// hide form and clear input fields
		this._hideForm();

		// Set local storage
		this._setLocalStorage();



	}
	_renderWorkoutMarker(_workout) {
		L.marker(_workout.coords)
			.addTo(this.#map)
			.bindPopup(L.popup({
				maxWidth: 250,
				minWidth: 100,
				autoClose: false,
				closeOnClick: false,
				className: `${_workout.type}-popup`,
			}))
			.setPopupContent(`${_workout.type ==='running' ? '🏃‍' : '🚴'} ${_workout.description}`)
			.openPopup();
	}

	_renderWorkout(workout) {
	let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
		  <h2 class="workout__title">${workout.description}</h2>
		  <div class="workout__details">
		    <span class="workout__icon">${workout.name ==='running' ? '🏃‍' : '🚴‍'}</span>
		    <span class="workout__value">${workout.distance}</span>
		    <span class="workout__unit">km</span>
		  </div>
		  <div class="workout__details">
		    <span class="workout__icon">⏱</span>
		    <span class="workout__value">${workout.duration}</span>
		    <span class="workout__unit">min</span>
		  </div>
	`;

	if(workout.type === 'running')
		html += `
			      <div class="workout__details">
			        <span class="workout__icon">⚡️</span>
			        <span class="workout__value">${workout.pace.toFixed(1)}</span>
			        <span class="workout__unit">min/km</span>
			      </div>
			      <div class="workout__details">
			        <span class="workout__icon">🦶🏼</span>
			        <span class="workout__value">${workout.cadence}</span>
			        <span class="workout__unit">spm</span>
			      </div>
		      </li>
		`;
	if(workout.type === 'cycling')
		html += `
	          <div class="workout__details">
	            <span class="workout__icon">⚡️</span>
	            <span class="workout__value">${workout.speed.toFixed(1)}</span>
	            <span class="workout__unit">km/h</span>
	          </div>
	          <div class="workout__details">
	            <span class="workout__icon">⛰</span>
	            <span class="workout__value">${workout.elevationGain}</span>
	            <span class="workout__unit">m</span>
	          </div>
	        </li>
		`;
	form.insertAdjacentHTML('afterend', html);
	}

	_moveToPopup(e) {
		if (!this.#map) return;

		const workoutEl = e.target.closest('.workout');
		if(!workoutEl) return;

		const workout = this.#workouts.find(wo =>
			wo.id === workoutEl.dataset.id
		);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1
			}
		});
		// using the public interface
		//workout.click();
	}

	_setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workouts'));

		if(!data) return;

		this.#workouts = data;
		this.#workouts.forEach(wo => {
			this._renderWorkout(wo);
		});
	}

	reset() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}


const app = new App();




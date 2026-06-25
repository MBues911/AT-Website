document.addEventListener('DOMContentLoaded', () => {
  let currentDate = new Date();
  let events = JSON.parse(localStorage.getItem('events')) || {};
  let selectedDate = null;

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('monthYear').textContent = 
      currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const container = document.getElementById('daysContainer');
    container.innerHTML = '';

    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    weekdays.forEach(day => {
      const header = document.createElement('div');
      header.className = 'weekday';
      header.textContent = day;
      container.appendChild(header);
    });

    for (let i = firstDay - 1; i > 0; i--) {
      const day = document.createElement('div');
      day.className = 'day other-month';
      day.innerHTML = `<div class="day-number">${daysInPrevMonth - i + 1}</div>`;
      container.appendChild(day);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const day = document.createElement('div');
      day.className = 'day';
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayEvents = events[dateKey] || [];

      let html = `<div class="day-number">${i}</div>`;
      if (dayEvents.length > 0) {
        html += '<div class="events">';
        dayEvents.forEach((event, idx) => {
          html += `<div class="event-item" data-date="${dateKey}" data-idx="${idx}"><span>${event}</span> <button class="delete-btn">✕</button></div>`;
        });
        html += '</div>';
      }
      day.innerHTML = html;
      day.addEventListener('click', () => openModal(dateKey));
      container.appendChild(day);
    }

    const totalCells = container.children.length - 7;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      const day = document.createElement('div');
      day.className = 'day other-month';
      day.innerHTML = `<div class="day-number">${i}</div>`;
      container.appendChild(day);
    }
  }

  function openModal(dateKey) {
    selectedDate = dateKey;
    const date = new Date(dateKey + 'T00:00:00');
    document.getElementById('modalDate').textContent = date.toLocaleDateString('de-DE', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '';

    if (events[dateKey]) {
      events[dateKey].forEach((event, idx) => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.setAttribute('data-date', dateKey);
        item.setAttribute('data-idx', idx);
        item.innerHTML = `<span>${event}</span> <button class="delete-btn">✕</button>`;
        eventsList.appendChild(item);
      });
    }

    document.getElementById('newEventInput').value = '';
    document.getElementById('modal').classList.add('active');
  }

  function deleteEvent(dateKey, idx) {
    events[dateKey].splice(idx, 1);
    if (events[dateKey].length === 0) delete events[dateKey];
    localStorage.setItem('events', JSON.stringify(events));
    renderCalendar();
    openModal(dateKey);
  }

  function addModalEvent() {
    const eventText = document.getElementById('newEventInput').value.trim();
    if (!eventText) return;

    if (!events[selectedDate]) {
      events[selectedDate] = [];
    }
    events[selectedDate].push(eventText);
    localStorage.setItem('events', JSON.stringify(events));
    openModal(selectedDate);
    renderCalendar();
  }

  function attachEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });

    document.getElementById('addModalEventBtn').addEventListener('click', addModalEvent);

    document.getElementById('closeModalBtn').addEventListener('click', () => {
      document.getElementById('modal').classList.remove('active');
    });

    document.getElementById('newEventInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addModalEvent();
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        e.stopPropagation();
        const item = e.target.closest('.event-item');
        const dateKey = item.dataset.date;
        const idx = item.dataset.idx;
        deleteEvent(dateKey, parseInt(idx));
      }
    });
  }

  attachEventListeners();
  renderCalendar();
});

const STORAGE_KEY = "sto-client-registry-v1";
const WORK_START = "09:00";
const LUNCH_START = "13:00";
const LUNCH_END = "14:00";
const WORK_END = "18:00";
const DAY_CAPACITY_MINUTES = 480;

const state = {
  clients: [],
  serviceItems: [],
  appointments: [],
  closedDays: [],
  activeTab: "dashboard",
  calendarDate: new Date(),
  selectedScheduleDate: today(),
  selectedClientId: null,
  selectedCarId: null,
  editingRepairId: null,
  generatedRepairDescription: "",
};

const $ = (selector) => document.querySelector(selector);
const byId = (id) => document.getElementById(id);

const elements = {
  searchInput: byId("searchInput"),
  newClientBtn: byId("newClientBtn"),
  exportBtn: byId("exportBtn"),
  importBtn: byId("importBtn"),
  importFile: byId("importFile"),
  emptyNewClientBtn: byId("emptyNewClientBtn"),
  clientList: byId("clientList"),
  stats: byId("stats"),
  pageTitle: byId("pageTitle"),
  dashboardTabBtn: byId("dashboardTabBtn"),
  clientsTabBtn: byId("clientsTabBtn"),
  catalogTabBtn: byId("catalogTabBtn"),
  dashboardView: byId("dashboardView"),
  calendarMonth: byId("calendarMonth"),
  calendarGrid: byId("calendarGrid"),
  prevMonthBtn: byId("prevMonthBtn"),
  nextMonthBtn: byId("nextMonthBtn"),
  selectedDateTitle: byId("selectedDateTitle"),
  toggleDayOffBtn: byId("toggleDayOffBtn"),
  scheduleForm: byId("scheduleForm"),
  scheduleServiceChecklist: byId("scheduleServiceChecklist"),
  dayAppointments: byId("dayAppointments"),
  emptyState: byId("emptyState"),
  content: byId("content"),
  catalogView: byId("catalogView"),
  clientForm: byId("clientForm"),
  deleteClientBtn: byId("deleteClientBtn"),
  serviceCatalogForm: byId("serviceCatalogForm"),
  serviceCatalog: byId("serviceCatalog"),
  newCarBtn: byId("newCarBtn"),
  carList: byId("carList"),
  carForm: byId("carForm"),
  carTitle: byId("carTitle"),
  deleteCarBtn: byId("deleteCarBtn"),
  servicePanel: byId("servicePanel"),
  oilStatus: byId("oilStatus"),
  newRepairBtn: byId("newRepairBtn"),
  repairList: byId("repairList"),
  repairDialog: byId("repairDialog"),
  repairForm: byId("repairForm"),
  repairDialogTitle: byId("repairDialogTitle"),
  repairServiceChecklist: byId("repairServiceChecklist"),
  partsList: byId("partsList"),
  printArea: byId("printArea"),
  addPartBtn: byId("addPartBtn"),
  saveRepairBtn: byId("saveRepairBtn"),
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("uk-UA", { style: "currency", currency: "UAH" });
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    clients: state.clients,
    serviceItems: state.serviceItems,
    appointments: state.appointments,
    closedDays: state.closedDays,
  }));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const saved = raw ? JSON.parse(raw) : [];
  state.clients = Array.isArray(saved) ? saved : saved.clients || [];
  state.serviceItems = Array.isArray(saved.serviceItems) ? saved.serviceItems : [];
  state.appointments = Array.isArray(saved.appointments) ? saved.appointments : [];
  state.closedDays = Array.isArray(saved.closedDays) ? saved.closedDays : [];
  if (state.clients[0]) {
    state.selectedClientId = state.clients[0].id;
    state.selectedCarId = state.clients[0].cars?.[0]?.id || null;
  }
}

function selectedClient() {
  return state.clients.find((client) => client.id === state.selectedClientId) || null;
}

function selectedCar() {
  const client = selectedClient();
  return client?.cars?.find((car) => car.id === state.selectedCarId) || null;
}

function repairsForSelectedCar() {
  return [...(selectedCar()?.repairs || [])].sort((a, b) => b.date.localeCompare(a.date));
}

function setFormValues(form, values) {
  [...form.elements].forEach((field) => {
    if (!field.name) return;
    field.value = values[field.name] ?? "";
  });
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function asNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function render() {
  renderStats();
  renderClients();
  renderServiceCatalog();
  renderSchedule();
  renderTabs();
  renderMain();
}

function renderTabs() {
  const isDashboard = state.activeTab === "dashboard";
  const isCatalog = state.activeTab === "catalog";
  const isClients = state.activeTab === "clients";
  elements.dashboardTabBtn.classList.toggle("active", isDashboard);
  elements.clientsTabBtn.classList.toggle("active", isClients);
  elements.catalogTabBtn.classList.toggle("active", isCatalog);
  elements.dashboardView.classList.toggle("hidden", !isDashboard);
  elements.catalogView.classList.toggle("hidden", !isCatalog);
}

function renderStats() {
  const clientCount = state.clients.length;
  const carCount = state.clients.reduce((sum, client) => sum + (client.cars?.length || 0), 0);
  const repairCount = state.clients.reduce(
    (sum, client) => sum + (client.cars || []).reduce((carSum, car) => carSum + (car.repairs?.length || 0), 0),
    0,
  );
  const plannedCount = state.appointments.length;

  elements.stats.innerHTML = `
    <div class="stat"><b>${clientCount}</b><span>клієнтів</span></div>
    <div class="stat"><b>${carCount}</b><span>авто</span></div>
    <div class="stat"><b>${repairCount}</b><span>робіт</span></div>
    <div class="stat"><b>${plannedCount}</b><span>план</span></div>
  `;
}

function renderClients() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = state.clients.filter((client) => {
    const carsText = (client.cars || [])
      .map((car) => `${car.vin} ${car.plate} ${car.model} ${car.year}`)
      .join(" ");
    return `${client.name} ${client.phone} ${carsText}`.toLowerCase().includes(query);
  });

  elements.clientList.innerHTML = filtered.length
    ? filtered
        .map(
          (client) => `
            <button class="client-item ${client.id === state.selectedClientId ? "active" : ""}" data-client-id="${client.id}" type="button">
              <strong>${escapeHtml(client.name || "Без імені")}</strong>
              <span>${escapeHtml(client.phone || "телефон не вказано")} · ${(client.cars || []).length} авто</span>
            </button>
          `,
        )
        .join("")
    : `<p class="muted">Нічого не знайдено</p>`;
}

function renderMain() {
  const isDashboard = state.activeTab === "dashboard";
  const isCatalog = state.activeTab === "catalog";
  const isClients = state.activeTab === "clients";
  const client = selectedClient();
  elements.emptyState.classList.toggle("hidden", !isClients || Boolean(client));
  elements.content.classList.toggle("hidden", !isClients || !client);
  elements.pageTitle.textContent = isDashboard
    ? "Планування робіт"
    : isCatalog
    ? "Довідник робіт"
    : client
      ? client.name || "Клієнт без імені"
      : "Оберіть клієнта";

  if (!isClients || !client) return;

  setFormValues(elements.clientForm, client);
  renderCars(client);
  renderCarDetails();
}

function renderCars(client) {
  elements.carList.innerHTML = (client.cars || []).length
    ? client.cars
        .map(
          (car) => `
            <button class="car-item ${car.id === state.selectedCarId ? "active" : ""}" data-car-id="${car.id}" type="button">
              <strong>${escapeHtml(car.model || car.plate || car.vin || "Авто без назви")}${car.year ? ` · ${escapeHtml(car.year)}` : ""}</strong>
              <span>${escapeHtml(car.plate || "номер не вказано")} · ${escapeHtml(car.odometer || 0)} км</span>
            </button>
          `,
        )
        .join("")
    : `<p class="muted">У цього клієнта ще немає авто</p>`;
}

function renderCarDetails() {
  const car = selectedCar();
  elements.carForm.classList.toggle("hidden", !car);
  elements.servicePanel.classList.toggle("hidden", !car);
  elements.deleteCarBtn.classList.toggle("hidden", !car);
  elements.carTitle.textContent = car ? car.model || car.plate || "Дані авто" : "Додайте авто";

  if (!car) {
    elements.repairList.innerHTML = "";
    return;
  }

  setFormValues(elements.carForm, car);
  renderOilStatus(car);
  renderRepairs();
}

function renderServiceCatalog() {
  elements.serviceCatalog.innerHTML = state.serviceItems.length
    ? state.serviceItems
        .map(
          (item) => `
            <div class="catalog-row" data-service-id="${item.id}">
              <label>Робота<input name="catalogName" value="${escapeAttr(item.name)}" /></label>
              <label>Ціна<input name="catalogPrice" type="number" min="0" step="0.01" value="${escapeAttr(item.price)}" /></label>
              <label>Хв<input name="catalogDuration" type="number" min="15" step="15" value="${escapeAttr(item.durationMinutes || 60)}" /></label>
              <button class="ghost danger" data-delete-service="${item.id}" type="button">×</button>
            </div>
          `,
        )
        .join("")
    : `<p class="muted">Додайте типові роботи, щоб вибирати їх у ремонті.</p>`;
}

function renderSchedule() {
  renderScheduleSelectors();
  renderScheduleServiceChecklist();
  renderCalendar();
  renderDayAppointments();
}

function renderScheduleSelectors() {
  const clientSelect = elements.scheduleForm.elements.clientId;
  const carSelect = elements.scheduleForm.elements.carId;
  const selectedClientId = clientSelect.value || state.selectedClientId || state.clients[0]?.id || "";
  const client = state.clients.find((item) => item.id === selectedClientId) || state.clients[0] || null;

  clientSelect.innerHTML = state.clients.length
    ? state.clients
        .map((clientItem) => `<option value="${clientItem.id}" ${clientItem.id === client?.id ? "selected" : ""}>${escapeHtml(clientItem.name || "Без імені")}</option>`)
        .join("")
    : `<option value="">Спочатку додайте клієнта</option>`;

  const cars = client?.cars || [];
  const selectedCarId = carSelect.value || cars[0]?.id || "";
  carSelect.innerHTML = cars.length
    ? cars
        .map((car) => {
          const title = [car.model, car.year, car.plate].filter(Boolean).join(" · ") || car.vin || "Авто без назви";
          return `<option value="${car.id}" ${car.id === selectedCarId ? "selected" : ""}>${escapeHtml(title)}</option>`;
        })
        .join("")
    : `<option value="">Спочатку додайте авто</option>`;

  elements.scheduleForm.elements.date.value = state.selectedScheduleDate;
}

function renderScheduleServiceChecklist() {
  const selectedIds = selectedScheduleServiceIds();
  elements.scheduleServiceChecklist.innerHTML = state.serviceItems.length
    ? state.serviceItems
        .map(
          (item) => `
            <label class="service-choice">
              <input type="checkbox" name="scheduleServiceItem" value="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""} />
              <strong>${escapeHtml(item.name)}</strong>
              <span>${formatDuration(item.durationMinutes || 60)}</span>
            </label>
          `,
        )
        .join("")
    : `<p class="muted">Спочатку додайте роботи в довідник.</p>`;
}

function renderCalendar() {
  const monthDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
  const monthName = monthDate.toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
  const firstDay = (monthDate.getDay() + 6) % 7;
  const start = new Date(monthDate);
  start.setDate(1 - firstDay);
  elements.calendarMonth.textContent = monthName[0].toUpperCase() + monthName.slice(1);

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const isClosed = isClosedDay(key);
    const booked = bookedMinutesForDate(key);
    const percent = Math.round((booked / DAY_CAPACITY_MINUTES) * 100);
    const loadClass = isClosed ? "day-off" : percent >= 90 ? "load-high" : percent >= 50 ? "load-medium" : percent > 0 ? "load-low" : "";
    days.push(`
      <button class="calendar-day ${date.getMonth() !== monthDate.getMonth() ? "outside" : ""} ${key === state.selectedScheduleDate ? "selected" : ""} ${loadClass}" data-calendar-date="${key}" type="button">
        <b>${date.getDate()}</b>
        <span>${isClosed ? "вихідний" : booked ? `${formatDuration(booked)} · ${percent}%` : "вільно"}</span>
      </button>
    `);
  }
  elements.calendarGrid.innerHTML = days.join("");
}

function renderDayAppointments() {
  const appointments = appointmentsForDate(state.selectedScheduleDate);
  const isClosed = isClosedDay(state.selectedScheduleDate);
  const title = new Date(`${state.selectedScheduleDate}T00:00:00`).toLocaleDateString("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const booked = bookedMinutesForDate(state.selectedScheduleDate);
  elements.selectedDateTitle.textContent = `${title[0].toUpperCase() + title.slice(1)} · ${isClosed ? "вихідний" : `зайнято ${formatDuration(booked)} з ${formatDuration(DAY_CAPACITY_MINUTES)}`}`;
  elements.toggleDayOffBtn.textContent = isClosed ? "Зробити робочим" : "Вихідний";
  elements.scheduleForm.classList.toggle("disabled-form", isClosed);
  [...elements.scheduleForm.elements].forEach((field) => {
    field.disabled = isClosed && field.type !== "hidden";
  });
  elements.dayAppointments.innerHTML = appointments.length
    ? appointments
        .map((appointment) => {
          const client = state.clients.find((item) => item.id === appointment.clientId);
          const car = client?.cars?.find((item) => item.id === appointment.carId);
          const carTitle = car ? [car.model, car.year, car.plate].filter(Boolean).join(" · ") : "Авто не знайдено";
          return `
            <article class="appointment-item">
              <div>
                <strong>${escapeHtml(appointmentTimeRange(appointment))} · ${escapeHtml(client?.name || "Клієнт не знайдений")}</strong>
                <span class="muted">${escapeHtml(carTitle)} · ${formatDuration(appointment.durationMinutes || 60)}</span>
              </div>
              <div>${escapeHtml(appointment.work || "").replaceAll("\n", "<br>")}</div>
              ${appointment.notes ? `<span class="muted">${escapeHtml(appointment.notes)}</span>` : ""}
              <div class="appointment-actions">
                <button class="ghost compact" data-open-appointment="${appointment.id}" type="button">Відкрити авто</button>
                <button class="ghost danger compact" data-delete-appointment="${appointment.id}" type="button">Видалити</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="muted">На цей день записів ще немає.</p>`;
}

function appointmentsForDate(date) {
  return state.appointments
    .filter((appointment) => appointment.date === date)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

function isClosedDay(date) {
  return state.closedDays.includes(date);
}

function bookedMinutesForDate(date) {
  return appointmentsForDate(date).reduce((sum, appointment) => sum + Number(appointment.durationMinutes || 60), 0);
}

function selectedScheduleServiceIds() {
  return [...elements.scheduleServiceChecklist.querySelectorAll('input[name="scheduleServiceItem"]:checked')].map((input) => input.value);
}

function selectedScheduleServices() {
  const ids = selectedScheduleServiceIds();
  return state.serviceItems
    .filter((item) => ids.includes(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      durationMinutes: Number(item.durationMinutes || 60),
    }));
}

function applyScheduleServices() {
  const services = selectedScheduleServices();
  if (!services.length) {
    elements.scheduleForm.elements.durationMinutes.value = 60;
    return;
  }
  const workText = services.map((service) => service.name).join("\n");
  const duration = services.reduce((sum, service) => sum + Number(service.durationMinutes || 60), 0);
  if (!elements.scheduleForm.elements.work.value.trim()) {
    elements.scheduleForm.elements.work.value = workText;
  }
  elements.scheduleForm.elements.durationMinutes.value = duration || 60;
}

function minutesFromTime(time) {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function actualEndMinutes(start, durationMinutes) {
  const lunchStart = minutesFromTime(LUNCH_START);
  const lunchEnd = minutesFromTime(LUNCH_END);
  const rawEnd = start + Number(durationMinutes || 60);
  if (start < lunchStart && rawEnd > lunchStart) {
    return rawEnd + (lunchEnd - lunchStart);
  }
  return rawEnd;
}

function busyIntervalsForDate(date, excludeId = null) {
  return appointmentsForDate(date)
    .filter((appointment) => appointment.id !== excludeId && appointment.time)
    .map((appointment) => {
      const start = minutesFromTime(appointment.time);
      return {
        start,
        end: actualEndMinutes(start, appointment.durationMinutes || 60),
      };
    });
}

function canFitAppointment(date, startTime, durationMinutes, excludeId = null) {
  if (isClosedDay(date)) return false;
  const start = minutesFromTime(startTime);
  const end = actualEndMinutes(start, durationMinutes || 60);
  if (start < minutesFromTime(WORK_START) || end > minutesFromTime(WORK_END)) return false;
  if (start >= minutesFromTime(LUNCH_START) && start < minutesFromTime(LUNCH_END)) return false;
  return !busyIntervalsForDate(date, excludeId).some((busy) => start < busy.end && end > busy.start);
}

function findNearestSlot(date, durationMinutes, preferredTime = WORK_START, excludeId = null) {
  let cursor = new Date(`${date}T00:00:00`);
  const preferredMinutes = minutesFromTime(preferredTime || WORK_START);
  for (let dayOffset = 0; dayOffset < 370; dayOffset += 1) {
    const key = dateKey(cursor);
    if (!isClosedDay(key)) {
      const dayStart = dayOffset === 0 ? Math.max(preferredMinutes, minutesFromTime(WORK_START)) : minutesFromTime(WORK_START);
      for (let minute = roundToQuarter(dayStart); minute + durationMinutes <= minutesFromTime(WORK_END); minute += 15) {
        const candidate = timeFromMinutes(minute);
        if (canFitAppointment(key, candidate, durationMinutes, excludeId)) {
          return { date: key, time: candidate };
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function roundToQuarter(minutes) {
  return Math.ceil(minutes / 15) * 15;
}

function formatDuration(minutes) {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (hours && rest) return `${hours} год ${rest} хв`;
  if (hours) return `${hours} год`;
  return `${rest} хв`;
}

function appointmentTimeRange(appointment) {
  if (!appointment.time) return "Без часу";
  const start = minutesFromTime(appointment.time);
  const end = actualEndMinutes(start, appointment.durationMinutes || 60);
  return `${appointment.time}-${timeFromMinutes(end)}`;
}

function toggleSelectedDayOff() {
  const date = state.selectedScheduleDate;
  if (isClosedDay(date)) {
    state.closedDays = state.closedDays.filter((item) => item !== date);
    save();
    render();
    return;
  }

  state.closedDays.push(date);
  const notMoved = moveAppointmentsFromClosedDay(date);
  if (notMoved) {
    alert(`Не вдалося перенести ${notMoved} запис(и): перевірте тривалість робіт або розклад.`);
  }
  save();
  render();
}

function moveAppointmentsFromClosedDay(date) {
  const appointments = appointmentsForDate(date);
  let notMoved = 0;
  appointments.forEach((appointment) => {
    const slot = findNearestSlot(nextDateKey(date), Number(appointment.durationMinutes || 60), appointment.time || WORK_START, appointment.id);
    if (!slot) {
      notMoved += 1;
      return;
    }
    appointment.date = slot.date;
    appointment.time = slot.time;
    appointment.notes = [appointment.notes, `Перенесено з ${date}, бо день позначено вихідним.`].filter(Boolean).join("\n");
  });
  return notMoved;
}

function nextDateKey(date) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return dateKey(next);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderOilStatus(car) {
  const interval = Number(car.oilInterval || 10000);
  const odometer = Number(car.odometer || 0);
  const lastOilChangeKm = Number(car.lastOilChangeKm || 0);
  const left = lastOilChangeKm + interval - odometer;

  let className = "ok";
  let text = `До заміни мастила залишилось ${left.toLocaleString("uk-UA")} км`;
  if (!lastOilChangeKm) {
    className = "warn";
    text = "Вкажіть пробіг останньої заміни мастила";
  } else if (left <= 0) {
    className = "due";
    text = `Заміна мастила прострочена на ${Math.abs(left).toLocaleString("uk-UA")} км`;
  } else if (left <= 1000) {
    className = "warn";
  }

  elements.oilStatus.className = `service-status ${className}`;
  elements.oilStatus.textContent = `${text}. Поточний одометр: ${odometer.toLocaleString("uk-UA")} км`;
}

function renderRepairs() {
  const repairs = repairsForSelectedCar();
  elements.repairList.innerHTML = repairs.length
    ? repairs.map(repairTemplate).join("")
    : `<p class="muted">Ремонтів ще немає</p>`;
}

function repairTemplate(repair) {
  const parts = repair.parts || [];
  const partsCost = parts.reduce((sum, part) => sum + Number(part.price || 0), 0);
  const total = partsCost + Number(repair.laborCost || 0);
  const partsText = parts.length
    ? parts.map((part) => `${escapeHtml(part.name || "Запчастина")} (${escapeHtml(part.serial || "без серії")}) - ${money(part.price)}`).join("<br>")
    : "Запчастини не вказані";

  return `
    <article class="repair-item">
      <div>
        <strong>${escapeHtml(repair.description)}</strong>
        <span>${partsText}</span>
      </div>
      <div class="repair-meta">
        <span>${escapeHtml(repair.date)}</span>
        <span>${Number(repair.odometer || 0).toLocaleString("uk-UA")} км</span>
        <span>робота: ${money(repair.laborCost)}</span>
        <span>разом: ${money(total)}</span>
        ${repair.oilChanged ? "<span>мастило замінено</span>" : ""}
      </div>
      <div class="repair-actions">
        <button class="ghost compact" data-print-repair="${repair.id}" type="button">Друк</button>
        <button class="ghost compact" data-edit-repair="${repair.id}" type="button">Редагувати</button>
        <button class="ghost danger compact" data-delete-repair="${repair.id}" type="button">Видалити</button>
      </div>
    </article>
  `;
}

function repairTotals(repair) {
  const parts = repair.parts || [];
  const partsCost = parts.reduce((sum, part) => sum + Number(part.price || 0), 0);
  const laborCost = Number(repair.laborCost || 0);
  return {
    partsCost,
    laborCost,
    total: partsCost + laborCost,
  };
}

function printRepair(repairId) {
  const client = selectedClient();
  const car = selectedCar();
  const repair = car?.repairs?.find((item) => item.id === repairId);
  if (!client || !car || !repair) return;

  const parts = repair.parts || [];
  const totals = repairTotals(repair);
  const savedServices = repair.services || selectedServiceNames(repair.serviceItemIds || []).map((name) => ({ name, price: 0 }));
  const savedServicesTotal = savedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const adjustment = totals.laborCost - savedServicesTotal;
  const workRows = savedServices.length
    ? [
        ...savedServices.map((service, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(service.name)}</td><td class="right">${money(service.price)}</td></tr>`),
        adjustment ? `<tr><td>${savedServices.length + 1}</td><td>Коригування ціни роботи</td><td class="right">${money(adjustment)}</td></tr>` : "",
      ].join("")
    : `<tr><td>1</td><td>${escapeHtml(repair.description)}</td><td class="right">${money(totals.laborCost)}</td></tr>`;
  const partRows = parts.length
    ? parts
        .map(
          (part, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(part.name || "Запчастина")}</td>
              <td>${escapeHtml(part.serial || "")}</td>
              <td class="right">${money(part.price)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4" class="muted-cell">Запчастини не вказані</td></tr>`;

  elements.printArea.innerHTML = `
    <div class="print-document">
      <header class="print-header">
        <div>
          <h1>Акт виконаних робіт</h1>
          <p>Дата: ${escapeHtml(repair.date)}</p>
        </div>
        <div class="print-company">
          <strong>FAVORITE GARAGE</strong>
          <p>+380985456508</p>
        </div>
      </header>

      <section class="print-grid">
        <div>
          <h2>Клієнт</h2>
          <p><b>Ім'я:</b> ${escapeHtml(client.name || "")}</p>
          <p><b>Телефон:</b> ${escapeHtml(client.phone || "")}</p>
        </div>
        <div>
          <h2>Авто</h2>
          <p><b>Модель:</b> ${escapeHtml(car.model || "")} ${car.year ? `(${escapeHtml(car.year)})` : ""}</p>
          <p><b>Держ. номер:</b> ${escapeHtml(car.plate || "")}</p>
          <p><b>VIN:</b> ${escapeHtml(car.vin || "")}</p>
          <p><b>Одометр:</b> ${Number(repair.odometer || 0).toLocaleString("uk-UA")} км</p>
        </div>
      </section>

      <h2>Виконані роботи</h2>
      <table>
        <thead><tr><th>№</th><th>Найменування</th><th>Ціна</th></tr></thead>
        <tbody>${workRows}</tbody>
      </table>

      <h2>Запчастини</h2>
      <table>
        <thead><tr><th>№</th><th>Назва</th><th>Серійний номер</th><th>Ціна</th></tr></thead>
        <tbody>${partRows}</tbody>
      </table>

      <section class="print-summary">
        <p><span>Робота:</span><b>${money(totals.laborCost)}</b></p>
        <p><span>Запчастини:</span><b>${money(totals.partsCost)}</b></p>
        <p class="total"><span>Разом:</span><b>${money(totals.total)}</b></p>
      </section>

      <section class="print-notes">
        <h2>Опис робіт</h2>
        <p>${escapeHtml(repair.description).replaceAll("\n", "<br>")}</p>
        ${repair.oilChanged ? "<p><b>Позначка:</b> мастило замінено.</p>" : ""}
      </section>

      <footer class="print-signatures">
        <div>Виконавець ____________________</div>
        <div>Клієнт ____________________</div>
      </footer>
    </div>
  `;
  window.print();
}

function addClient() {
  const client = {
    id: uid(),
    name: "Новий клієнт",
    phone: "",
    notes: "",
    cars: [],
  };
  state.clients.unshift(client);
  state.activeTab = "clients";
  state.selectedClientId = client.id;
  state.selectedCarId = null;
  save();
  render();
  elements.clientForm.elements.name.focus();
  elements.clientForm.elements.name.select();
}

function addCar() {
  const client = selectedClient();
  if (!client) return;
  const car = {
    id: uid(),
    vin: "",
    plate: "",
    model: "Нове авто",
    year: "",
    fuel: "",
    gearbox: "",
    oilVolume: "",
    odometer: 0,
    oilInterval: 10000,
    lastOilChangeKm: "",
    filterSerials: "",
    repairs: [],
  };
  client.cars = client.cars || [];
  client.cars.unshift(car);
  state.selectedCarId = car.id;
  save();
  render();
  elements.carForm.elements.model.focus();
  elements.carForm.elements.model.select();
}

function addAppointment(event) {
  event.preventDefault();
  const data = formData(elements.scheduleForm);
  const durationMinutes = Number(data.durationMinutes || 60);
  if (!data.date || !data.clientId || !data.carId || !data.work.trim() || !durationMinutes) {
    elements.scheduleForm.reportValidity();
    return;
  }
  const preferredTime = data.timeMode === "manual" ? data.time || WORK_START : data.time || WORK_START;
  const slot = findNearestSlot(data.date, durationMinutes, preferredTime);
  if (!slot) {
    alert("Не вдалося знайти вільний час для цього запису.");
    return;
  }
  const moved = slot.date !== data.date || (data.timeMode === "manual" && slot.time !== data.time);
  state.appointments.push({
    id: uid(),
    date: slot.date,
    time: slot.time,
    clientId: data.clientId,
    carId: data.carId,
    work: data.work.trim(),
    durationMinutes,
    serviceItemIds: selectedScheduleServiceIds(),
    services: selectedScheduleServices(),
    notes: [data.notes.trim(), moved ? `Запис поставлено на найближчий вільний час: ${slot.date} ${slot.time}.` : ""].filter(Boolean).join("\n"),
  });
  state.selectedScheduleDate = slot.date;
  state.calendarDate = new Date(`${slot.date}T00:00:00`);
  elements.scheduleForm.elements.work.value = "";
  elements.scheduleForm.elements.notes.value = "";
  elements.scheduleForm.elements.time.value = "";
  save();
  render();
}

function openAppointment(appointmentId) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;
  state.activeTab = "clients";
  state.selectedClientId = appointment.clientId;
  state.selectedCarId = appointment.carId;
  render();
}

function deleteAppointment(appointmentId) {
  if (!confirm("Видалити цей запис із планування?")) return;
  state.appointments = state.appointments.filter((appointment) => appointment.id !== appointmentId);
  save();
  render();
}

function openRepairDialog(repairId = null) {
  const car = selectedCar();
  if (!car) return;
  const repair = repairId ? car.repairs.find((item) => item.id === repairId) : null;
  state.editingRepairId = repairId;
  state.generatedRepairDescription = selectedServiceNames(repair?.serviceItemIds || []).join("\n");
  elements.repairDialogTitle.textContent = repair ? "Редагувати роботу" : "Нова робота";
  setFormValues(elements.repairForm, {
    date: repair?.date || today(),
    odometer: repair?.odometer || car.odometer || 0,
    laborCost: repair?.laborCost || "",
    oilChanged: repair?.oilChanged ? "yes" : "no",
    description: repair?.description || "",
  });
  renderRepairServiceChecklist(repair?.serviceItemIds || []);
  elements.partsList.innerHTML = "";
  (repair?.parts?.length ? repair.parts : [{ name: "", serial: "", price: "" }]).forEach(addPartRow);
  elements.repairDialog.showModal();
}

function selectedServiceNames(ids) {
  return state.serviceItems.filter((item) => ids.includes(item.id)).map((item) => item.name);
}

function renderRepairServiceChecklist(selectedIds = []) {
  elements.repairServiceChecklist.innerHTML = state.serviceItems.length
    ? state.serviceItems
        .map(
          (item) => `
            <label class="service-choice">
              <input type="checkbox" name="serviceItem" value="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""} />
              <strong>${escapeHtml(item.name)}</strong>
              <span>${money(item.price)}</span>
            </label>
          `,
        )
        .join("")
    : `<p class="muted">Спочатку додайте роботи в довідник.</p>`;
}

function selectedRepairServiceIds() {
  return [...elements.repairServiceChecklist.querySelectorAll('input[name="serviceItem"]:checked')].map((input) => input.value);
}

function selectedRepairServices() {
  const ids = selectedRepairServiceIds();
  return state.serviceItems
    .filter((item) => ids.includes(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: asNumber(item.price),
    }));
}

function applySelectedServicesToRepair() {
  const ids = selectedRepairServiceIds();
  const selected = state.serviceItems.filter((item) => ids.includes(item.id));
  const serviceText = selected.map((item) => item.name).join("\n");
  const description = elements.repairForm.elements.description;
  const currentDescription = description.value.trim();
  const generatedDescription = state.generatedRepairDescription.trim();

  elements.repairForm.elements.laborCost.value = selected.reduce((sum, item) => sum + Number(item.price || 0), 0) || "";
  if (!currentDescription || currentDescription === generatedDescription) {
    description.value = serviceText;
    state.generatedRepairDescription = serviceText;
  }
}

function addPartRow(part = {}) {
  const row = document.createElement("div");
  row.className = "part-row";
  row.innerHTML = `
    <label>Назва<input name="partName" value="${escapeAttr(part.name || "")}" /></label>
    <label>Серійний номер<input name="partSerial" value="${escapeAttr(part.serial || "")}" /></label>
    <label>Ціна<input name="partPrice" type="number" min="0" step="0.01" value="${escapeAttr(part.price || "")}" /></label>
    <button class="ghost danger" data-remove-part type="button">×</button>
  `;
  elements.partsList.append(row);
}

function saveRepair() {
  const car = selectedCar();
  if (!car) return;
  const data = formData(elements.repairForm);
  if (!data.date || !data.odometer || !data.description.trim()) {
    elements.repairForm.reportValidity();
    return;
  }

  const rows = [...elements.partsList.querySelectorAll(".part-row")];
  const parts = rows
    .map((row) => ({
      name: row.querySelector('[name="partName"]').value.trim(),
      serial: row.querySelector('[name="partSerial"]').value.trim(),
      price: asNumber(row.querySelector('[name="partPrice"]').value),
    }))
    .filter((part) => part.name || part.serial || part.price !== "");

  const repair = {
    id: state.editingRepairId || uid(),
    date: data.date,
    odometer: asNumber(data.odometer),
    laborCost: asNumber(data.laborCost),
    oilChanged: data.oilChanged === "yes",
    description: data.description.trim(),
    serviceItemIds: selectedRepairServiceIds(),
    services: selectedRepairServices(),
    parts,
  };

  car.repairs = car.repairs || [];
  const index = car.repairs.findIndex((item) => item.id === repair.id);
  if (index >= 0) car.repairs[index] = repair;
  else car.repairs.unshift(repair);

  car.odometer = Math.max(Number(car.odometer || 0), Number(repair.odometer || 0));
  if (repair.oilChanged) {
    car.lastOilChangeKm = repair.odometer;
  }

  save();
  elements.repairDialog.close();
  render();
}

function deleteRepair(repairId) {
  const car = selectedCar();
  if (!car || !confirm("Видалити цей запис про роботу?")) return;
  car.repairs = (car.repairs || []).filter((repair) => repair.id !== repairId);
  save();
  render();
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "sto-client-registry",
    version: 1,
    clients: state.clients,
    serviceItems: state.serviceItems,
    appointments: state.appointments,
    closedDays: state.closedDays,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sto-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const clients = Array.isArray(payload) ? payload : payload.clients;
      const serviceItems = Array.isArray(payload.serviceItems) ? payload.serviceItems : [];
      const appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
      const closedDays = Array.isArray(payload.closedDays) ? payload.closedDays : [];
      if (!Array.isArray(clients)) throw new Error("Bad backup");
      if (!confirm("Імпорт замінить поточну локальну базу. Продовжити?")) return;
      state.clients = clients;
      state.serviceItems = serviceItems;
      state.appointments = appointments;
      state.closedDays = closedDays;
      state.selectedClientId = state.clients[0]?.id || null;
      state.selectedCarId = state.clients[0]?.cars?.[0]?.id || null;
      save();
      render();
    } catch {
      alert("Не вдалося прочитати файл резервної копії.");
    } finally {
      elements.importFile.value = "";
    }
  };
  reader.readAsText(file);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

elements.newClientBtn.addEventListener("click", addClient);
elements.emptyNewClientBtn.addEventListener("click", addClient);
elements.dashboardTabBtn.addEventListener("click", () => {
  state.activeTab = "dashboard";
  render();
});
elements.clientsTabBtn.addEventListener("click", () => {
  state.activeTab = "clients";
  render();
});
elements.catalogTabBtn.addEventListener("click", () => {
  state.activeTab = "catalog";
  render();
});
elements.exportBtn.addEventListener("click", exportData);
elements.importBtn.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", () => importData(elements.importFile.files[0]));
elements.searchInput.addEventListener("input", renderClients);
elements.newCarBtn.addEventListener("click", addCar);
elements.newRepairBtn.addEventListener("click", () => openRepairDialog());
elements.addPartBtn.addEventListener("click", () => addPartRow());
elements.saveRepairBtn.addEventListener("click", saveRepair);
elements.scheduleForm.addEventListener("submit", addAppointment);
elements.scheduleForm.elements.clientId.addEventListener("change", () => {
  const clientId = elements.scheduleForm.elements.clientId.value;
  const client = state.clients.find((item) => item.id === clientId);
  elements.scheduleForm.elements.carId.value = client?.cars?.[0]?.id || "";
  renderScheduleSelectors();
});
elements.scheduleForm.elements.date.addEventListener("change", () => {
  state.selectedScheduleDate = elements.scheduleForm.elements.date.value || today();
  state.calendarDate = new Date(`${state.selectedScheduleDate}T00:00:00`);
  renderSchedule();
});
elements.scheduleServiceChecklist.addEventListener("change", applyScheduleServices);
elements.toggleDayOffBtn.addEventListener("click", toggleSelectedDayOff);
elements.prevMonthBtn.addEventListener("click", () => {
  state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
  renderSchedule();
});
elements.nextMonthBtn.addEventListener("click", () => {
  state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
  renderSchedule();
});
elements.calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-calendar-date]");
  if (!button) return;
  state.selectedScheduleDate = button.dataset.calendarDate;
  state.calendarDate = new Date(`${state.selectedScheduleDate}T00:00:00`);
  renderSchedule();
});
elements.dayAppointments.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-appointment]");
  const deleteButton = event.target.closest("[data-delete-appointment]");
  if (openButton) openAppointment(openButton.dataset.openAppointment);
  if (deleteButton) deleteAppointment(deleteButton.dataset.deleteAppointment);
});

elements.serviceCatalogForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(elements.serviceCatalogForm);
  state.serviceItems.push({
    id: uid(),
    name: data.name.trim(),
    price: asNumber(data.price),
    durationMinutes: asNumber(data.durationMinutes) || 60,
  });
  elements.serviceCatalogForm.reset();
  save();
  render();
});

elements.clientList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-client-id]");
  if (!button) return;
  const client = state.clients.find((item) => item.id === button.dataset.clientId);
  state.activeTab = "clients";
  state.selectedClientId = client.id;
  state.selectedCarId = client.cars?.[0]?.id || null;
  render();
});

elements.carList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-car-id]");
  if (!button) return;
  state.selectedCarId = button.dataset.carId;
  render();
});

elements.clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const client = selectedClient();
  if (!client) return;
  Object.assign(client, formData(elements.clientForm));
  save();
  render();
});

elements.carForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const car = selectedCar();
  if (!car) return;
  const data = formData(elements.carForm);
  Object.assign(car, {
    ...data,
    year: asNumber(data.year),
    oilVolume: asNumber(data.oilVolume),
    odometer: asNumber(data.odometer),
    oilInterval: asNumber(data.oilInterval) || 10000,
    lastOilChangeKm: asNumber(data.lastOilChangeKm),
  });
  save();
  render();
});

elements.deleteClientBtn.addEventListener("click", () => {
  const client = selectedClient();
  if (!client || !confirm(`Видалити клієнта "${client.name}" разом з авто та роботами?`)) return;
  state.clients = state.clients.filter((item) => item.id !== client.id);
  state.selectedClientId = state.clients[0]?.id || null;
  state.selectedCarId = state.clients[0]?.cars?.[0]?.id || null;
  save();
  render();
});

elements.deleteCarBtn.addEventListener("click", () => {
  const client = selectedClient();
  const car = selectedCar();
  if (!client || !car || !confirm("Видалити це авто разом з історією ремонтів?")) return;
  client.cars = client.cars.filter((item) => item.id !== car.id);
  state.selectedCarId = client.cars[0]?.id || null;
  save();
  render();
});

elements.repairList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-repair]");
  const deleteButton = event.target.closest("[data-delete-repair]");
  const printButton = event.target.closest("[data-print-repair]");
  if (printButton) printRepair(printButton.dataset.printRepair);
  if (editButton) openRepairDialog(editButton.dataset.editRepair);
  if (deleteButton) deleteRepair(deleteButton.dataset.deleteRepair);
});

elements.partsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-part]");
  if (!button) return;
  button.closest(".part-row").remove();
  if (!elements.partsList.children.length) addPartRow();
});

elements.serviceCatalog.addEventListener("input", (event) => {
  const row = event.target.closest("[data-service-id]");
  if (!row) return;
  const item = state.serviceItems.find((service) => service.id === row.dataset.serviceId);
  if (!item) return;
  item.name = row.querySelector('[name="catalogName"]').value.trim();
  item.price = asNumber(row.querySelector('[name="catalogPrice"]').value);
  item.durationMinutes = asNumber(row.querySelector('[name="catalogDuration"]').value) || 60;
  save();
});

elements.serviceCatalog.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-service]");
  if (!button) return;
  if (!confirm("Видалити цю роботу з довідника? Старі ремонти залишаться без змін.")) return;
  state.serviceItems = state.serviceItems.filter((item) => item.id !== button.dataset.deleteService);
  save();
  render();
});

elements.repairServiceChecklist.addEventListener("change", applySelectedServicesToRepair);

load();
render();

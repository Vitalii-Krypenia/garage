const STORAGE_KEY = "sto-client-registry-v1";

const state = {
  clients: [],
  serviceItems: [],
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
  emptyState: byId("emptyState"),
  content: byId("content"),
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
  }));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const saved = raw ? JSON.parse(raw) : [];
  state.clients = Array.isArray(saved) ? saved : saved.clients || [];
  state.serviceItems = Array.isArray(saved.serviceItems) ? saved.serviceItems : [];
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
  renderMain();
}

function renderStats() {
  const clientCount = state.clients.length;
  const carCount = state.clients.reduce((sum, client) => sum + (client.cars?.length || 0), 0);
  const repairCount = state.clients.reduce(
    (sum, client) => sum + (client.cars || []).reduce((carSum, car) => carSum + (car.repairs?.length || 0), 0),
    0,
  );

  elements.stats.innerHTML = `
    <div class="stat"><b>${clientCount}</b><span>клієнтів</span></div>
    <div class="stat"><b>${carCount}</b><span>авто</span></div>
    <div class="stat"><b>${repairCount}</b><span>робіт</span></div>
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
  const client = selectedClient();
  elements.emptyState.classList.toggle("hidden", Boolean(client));
  elements.content.classList.toggle("hidden", !client);
  elements.pageTitle.textContent = client ? client.name || "Клієнт без імені" : "Оберіть клієнта";

  if (!client) return;

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
              <button class="ghost danger" data-delete-service="${item.id}" type="button">×</button>
            </div>
          `,
        )
        .join("")
    : `<p class="muted">Додайте типові роботи, щоб вибирати їх у ремонті.</p>`;
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
        <button class="ghost compact" data-edit-repair="${repair.id}" type="button">Редагувати</button>
        <button class="ghost danger compact" data-delete-repair="${repair.id}" type="button">Видалити</button>
      </div>
    </article>
  `;
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
      if (!Array.isArray(clients)) throw new Error("Bad backup");
      if (!confirm("Імпорт замінить поточну локальну базу. Продовжити?")) return;
      state.clients = clients;
      state.serviceItems = serviceItems;
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
elements.exportBtn.addEventListener("click", exportData);
elements.importBtn.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", () => importData(elements.importFile.files[0]));
elements.searchInput.addEventListener("input", renderClients);
elements.newCarBtn.addEventListener("click", addCar);
elements.newRepairBtn.addEventListener("click", () => openRepairDialog());
elements.addPartBtn.addEventListener("click", () => addPartRow());
elements.saveRepairBtn.addEventListener("click", saveRepair);

elements.serviceCatalogForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(elements.serviceCatalogForm);
  state.serviceItems.push({
    id: uid(),
    name: data.name.trim(),
    price: asNumber(data.price),
  });
  elements.serviceCatalogForm.reset();
  save();
  render();
});

elements.clientList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-client-id]");
  if (!button) return;
  const client = state.clients.find((item) => item.id === button.dataset.clientId);
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

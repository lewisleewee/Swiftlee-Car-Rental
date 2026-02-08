"use strict";

/**
 * Swiftlee - Frontend-only workflow for ISIT207 Assignment 2
 * Core requirements shown:
 * 1) Customer reserves car using credit card (simulated validation)
 * 2) Customer rents car at office (staff confirms pickup)
 * 3) Customer returns car at car park (return)
 * 4) Employee inspection + update status (damage/no damage)
 * 5) Customer pays final bill (rental + damages)
 * Data stored in JS arrays + localStorage (no backend).
 */

const DEFAULT_STATE = {
  nextId: 1001,
  cars: [
  { id:"C01", name:"Mazda CX-5", rate:85,  tag:"SUV",    status:"Available", img:"assets/Mazda CX-5.png" },
  { id:"C02", name:"Mazda MX-5", rate:220, tag:"Sports", status:"Available", img:"assets/Mazda MX-5.png" },
  { id:"C03", name:"Hyundai Santa Fe", rate:100, tag:"SUV", status:"Available", img:"assets/Hyundai Santa Fe.png" },
  { id:"C04", name:"Mercedes G-Wagon", rate:280, tag:"SUV", status:"Available", img:"assets/Mercedes G-Wagon.png" },
  { id:"C05", name:"Mercedes 300SL Gullwing", rate:320, tag:"Sports", status:"Available", img:"assets/Mercedes 300SL Gullwing.png" },
  { id:"C06", name:"Porsche Macan", rate:350, tag:"SUV", status:"Available", img:"assets/Porsche Macan.png" },
],
  bookings: []
};

let state = loadState();
let selectedCarId = "C02"; // featured default
let currentInvoiceId = null;

/* ---------- DOM ---------- */
const heroPickupDate = document.getElementById("heroPickupDate");
const heroReturnDate = document.getElementById("heroReturnDate");
const heroReserveBtn = document.getElementById("heroReserveBtn");
const heroMsg = document.getElementById("heroMsg");

const featuredName = document.getElementById("featuredName");
const featuredPrice = document.getElementById("featuredPrice");
const featuredRentBtn = document.getElementById("featuredRentBtn");
const featuredImg = document.getElementById("featuredImg");

const fleetGrid = document.getElementById("fleetGrid");

const custName = document.getElementById("custName");
const custEmail = document.getElementById("custEmail");
const custPhone = document.getElementById("custPhone");
const carSelect = document.getElementById("carSelect");
const pickupDate = document.getElementById("pickupDate");
const returnDate = document.getElementById("returnDate");
const pickupTime = document.getElementById("pickupTime");
const returnTime = document.getElementById("returnTime");
const returnLocation = document.getElementById("returnLocation");

const cardNumber = document.getElementById("cardNumber");
const cardExpiry = document.getElementById("cardExpiry");
const cardCvv = document.getElementById("cardCvv");
const reserveBtn = document.getElementById("reserveBtn");
const reserveMsg = document.getElementById("reserveMsg");

const successSection = document.getElementById("success");
const successId = document.getElementById("successId");

const bookingsTable = document.getElementById("bookingsTable");

const inspectId = document.getElementById("inspectId");
const inspectCondition = document.getElementById("inspectCondition");
const damageNotes = document.getElementById("damageNotes");
const damageCost = document.getElementById("damageCost");
const inspectBtn = document.getElementById("inspectBtn");
const inspectMsg = document.getElementById("inspectMsg");

const billId = document.getElementById("billId");
const genBillBtn = document.getElementById("genBillBtn");
const invoice = document.getElementById("invoice");
const payBtn = document.getElementById("payBtn");
const billMsg = document.getElementById("billMsg");

const themeBtn = document.getElementById("themeBtn");
const resetBtn = document.getElementById("resetBtn");

/* ---------- Theme ---------- */
(function initTheme(){
  const t = localStorage.getItem("vz_theme") || "dark";
  document.body.classList.toggle("light", t === "light");
  themeBtn.textContent = (t === "light") ? "🌞" : "🌙";
})();
themeBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem("vz_theme", isLight ? "light" : "dark");
  themeBtn.textContent = isLight ? "🌞" : "🌙";
});

/* ---------- Navigation active highlight (simple) ---------- */
document.querySelectorAll(".nav-links a").forEach(a=>{
  a.addEventListener("click", ()=>{
    document.querySelectorAll(".nav-links a").forEach(x=>x.classList.remove("active"));
    a.classList.add("active");
  });
});

/* ---------- Helpers ---------- */
function saveState(){
  localStorage.setItem("vz_state", JSON.stringify(state));
}
function loadState(){
  const raw = localStorage.getItem("vz_state");
  if(!raw) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(raw);
    if(!parsed.cars || !parsed.bookings) return structuredClone(DEFAULT_STATE);
    return parsed;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}
function setMsg(el, text, ok=true){
  el.className = "msg " + (ok ? "ok" : "bad");
  el.textContent = text;
}
function money(n){ return `$${Number(n).toFixed(2)}`; }
function daysBetween(start, end){
  const s = new Date(start);
  const e = new Date(end);
  const d = Math.ceil((e - s) / (1000*60*60*24));
  return Number.isFinite(d) ? d : 0;
}
function findCar(id){ return state.cars.find(c=>c.id===id); }
function findBooking(id){ return state.bookings.find(b=>b.id.toUpperCase()===id.toUpperCase()); }
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}
function statusLabel(s){
  switch(s){
    case "Reserved": return "Reserved";
    case "Rented": return "Rented (Car Unavailable)";
    case "ReturnedPendingInspection": return "Returned (Pending Inspection)";
    case "Inspected": return "Inspected (Ready to Bill)";
    case "Paid": return "Paid / Completed";
    default: return s;
  }
}
function nextActionForStatus(status){
  // Action buttons shown in dashboard to prove the workflow
  if(status === "Reserved") return { label:"Pickup (Office)", action:"pickup" };
  if(status === "Rented") return { label:"Return (Car Park)", action:"return" };
  if(status === "ReturnedPendingInspection") return { label:"Inspect → Use right panel", action:"inspect" };
  if(status === "Inspected") return { label:"Bill/Pay → Use right panel", action:"bill" };
  if(status === "Paid") return { label:"Done", action:"none" };
  return { label:"-", action:"none" };
}

/* ---------- Hero flow ---------- */
heroReserveBtn.addEventListener("click", () => {
  const p = heroPickupDate.value;
  const r = heroReturnDate.value;
  if(!p || !r) return setMsg(heroMsg, "Please select pick-up and return dates.", false);
  if(daysBetween(p,r) <= 0) return setMsg(heroMsg, "Return date must be after pick-up date.", false);

  // carry dates into booking form + go fleet
  pickupDate.value = p;
  returnDate.value = r;
  window.location.hash = "#fleet";
  setMsg(heroMsg, "Dates saved. Now choose a car in Our Fleet.", true);
});

/* Featured button opens booking form */
featuredRentBtn.addEventListener("click", () => {
  pickupDate.value = heroPickupDate.value || pickupDate.value;
  returnDate.value = heroReturnDate.value || returnDate.value;
  selectCarAndGoBooking(selectedCarId);
});

/* ---------- Fleet render ---------- */
function renderFleet(){
  fleetGrid.innerHTML = "";
  state.cars.forEach(car=>{
    const card = document.createElement("div");
    card.className = "fleet-card";
    card.innerHTML = `
      <div class="fleet-img" style="background-image:url('${car.img}')"></div>
      <div class="fleet-body">
        <div class="price-row">
          <div class="price">${money(car.rate)}</div>
          <div class="tag">${escapeHtml(car.tag)}</div>
        </div>
        <div class="fleet-name">${escapeHtml(car.name)}</div>
        <div class="muted">Status: <b>${escapeHtml(car.status)}</b></div>
      </div>
      <div class="fleet-actions">
        <button class="btn btn-yellow btn-wide" ${car.status!=="Available" ? "disabled" : ""} data-car="${car.id}">
          Rent car
        </button>
      </div>
    `;
    fleetGrid.appendChild(card);
  });

  fleetGrid.querySelectorAll("button[data-car]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-car");
      selectCarAndGoBooking(id);
    });
  });

  // Featured label update
  const featured = findCar(selectedCarId) || state.cars[1];
  featuredName.textContent = featured.name;
  featuredPrice.textContent = money(featured.rate).replace(".00","");
  if (featuredImg) {
  const url = featured.img ? encodeURI(featured.img) : "";
  featuredImg.style.backgroundImage = url ? `url("${url}")` : "";
}

}

/* Select car + go booking section */
function selectCarAndGoBooking(carId){
  selectedCarId = carId;
  carSelect.value = carId;
  window.location.hash = "#booking";
  // small UX: put cursor to name
  custName.focus();
}

/* ---------- Booking form ---------- */
function renderCarSelect(){
  carSelect.innerHTML = "";
  state.cars.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} (${money(c.rate)}/day) - ${c.status}`;
    opt.disabled = (c.status !== "Available");
    carSelect.appendChild(opt);
  });
  // keep selection
  carSelect.value = selectedCarId;
}
carSelect.addEventListener("change", ()=> selectedCarId = carSelect.value);

cardNumber.addEventListener("input", () => {
  const digits = cardNumber.value.replace(/\D/g,"").slice(0,16);
  cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
});
cardExpiry.addEventListener("input", () => {
  const raw = cardExpiry.value.replace(/\D/g,"").slice(0,4);
  if(raw.length <= 2) cardExpiry.value = raw;
  else cardExpiry.value = raw.slice(0,2) + "/" + raw.slice(2);
});

function validateCard(){
  const num = cardNumber.value.replace(/\s/g,"");
  const exp = cardExpiry.value.trim();
  const cvv = cardCvv.value.trim();
  const numOk = /^\d{16}$/.test(num);
  const expOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp);
  const cvvOk = /^\d{3,4}$/.test(cvv);
  return numOk && expOk && cvvOk;
}

reserveBtn.addEventListener("click", () => {
  const carId = carSelect.value;
  const car = findCar(carId);

  if(!car) return setMsg(reserveMsg, "Please select a car.", false);
  if(car.status !== "Available") return setMsg(reserveMsg, "Car not available.", false);

  const name = custName.value.trim();
  const email = custEmail.value.trim();
  const phone = custPhone.value.trim();

  if(!name || !email || !phone) return setMsg(reserveMsg, "Please fill name, email, and contact number.", false);

  const p = pickupDate.value;
  const r = returnDate.value;
  if(!p || !r) return setMsg(reserveMsg, "Please fill pickup and return date.", false);
  if(daysBetween(p,r) <= 0) return setMsg(reserveMsg, "Return date must be after pick-up date.", false);

  if(!validateCard()) return setMsg(reserveMsg, "Credit card invalid (simulation).", false);

  const id = `R${state.nextId++}`;
  const booking = {
    id,
    customer: { name, email, phone },
    carId,
    pickupDate: p,
    returnDate: r,
    pickupTime: pickupTime.value || "12:00",
    returnTime: returnTime.value || "18:30",
    returnLocation: returnLocation.value,
    status: "Reserved",
    inspection: { hasDamage:false, notes:"", damageCost:0 },
    paid: false
  };

  state.bookings.push(booking);
  saveState();
  renderAll();

  // success screen
  successId.textContent = id;
  successSection.classList.remove("hidden");
  window.location.hash = "#success";
  setMsg(reserveMsg, `Reservation created: ${id}`, true);
});

/* ---------- Staff Dashboard table + actions ---------- */
function renderBookingsTable(){
  const rows = state.bookings
    .slice()
    .sort((a,b)=>a.id.localeCompare(b.id))
    .map(b=>{
      const car = findCar(b.carId);
      const action = nextActionForStatus(b.status);

      return `
      <tr>
        <td><b>${b.id}</b></td>
        <td>${escapeHtml(b.customer.name)}</td>
        <td>${escapeHtml(car ? car.name : b.carId)}</td>
        <td>${b.pickupDate} → ${b.returnDate}</td>
        <td>${statusLabel(b.status)}</td>
        <td>
          ${action.action==="none" ? `<span class="muted">${action.label}</span>` : `
            <button class="btn btn-ghost" data-action="${action.action}" data-id="${b.id}">
              ${action.label}
            </button>
          `}
        </td>
      </tr>
      `;
    }).join("");

  bookingsTable.innerHTML = rows || `<tr><td colspan="6">No bookings yet.</td></tr>`;

  bookingsTable.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      handleWorkflowAction(action, id);
    });
  });
}

function handleWorkflowAction(action, id){
  const b = findBooking(id);
  if(!b) return;

  const car = findCar(b.carId);

  if(action === "pickup"){
    if(b.status !== "Reserved") return;
    if(!car || car.status !== "Available") return;
    b.status = "Rented";
    car.status = "Unavailable";
    saveState(); renderAll();
    alert(`Pickup confirmed for ${b.id}. Status: Rented.`);
    return;
  }

  if(action === "return"){
    if(b.status !== "Rented") return;
    b.status = "ReturnedPendingInspection";
    saveState(); renderAll();
    alert(`Return recorded for ${b.id}. Status: Pending Inspection.`);
    // auto-fill inspection box
    inspectId.value = b.id;
    window.location.hash = "#dashboard";
    return;
  }

  if(action === "inspect"){
    // guide user to inspection panel
    inspectId.value = b.id;
    window.location.hash = "#dashboard";
    return;
  }

  if(action === "bill"){
    billId.value = b.id;
    window.location.hash = "#dashboard";
    return;
  }
}

/* ---------- Inspection ---------- */
inspectBtn.addEventListener("click", ()=>{
  const id = inspectId.value.trim();
  const b = findBooking(id);
  if(!b) return setMsg(inspectMsg, "Booking not found.", false);
  if(b.status !== "ReturnedPendingInspection")
    return setMsg(inspectMsg, `Cannot inspect. Current status: ${b.status}`, false);

  const cond = inspectCondition.value;
  const cost = Number(damageCost.value || 0);

  if(cond === "damage" && (!Number.isFinite(cost) || cost < 1))
    return setMsg(inspectMsg, "If damage found, enter damage cost > 0.", false);

  b.inspection.hasDamage = (cond === "damage");
  b.inspection.notes = (damageNotes.value || "").trim();
  b.inspection.damageCost = b.inspection.hasDamage ? cost : 0;

  b.status = "Inspected";
  saveState(); renderAll();
  setMsg(inspectMsg, `Inspection saved for ${b.id}. Status: Inspected.`, true);

  // auto-fill billing
  billId.value = b.id;
});

/* ---------- Billing + Pay ---------- */
genBillBtn.addEventListener("click", ()=>{
  const id = billId.value.trim();
  const b = findBooking(id);
  if(!b) return setMsg(billMsg, "Booking not found.", false);
  if(b.status !== "Inspected") return setMsg(billMsg, `Generate invoice after inspection. Current: ${b.status}`, false);

  const car = findCar(b.carId);
  if(!car) return setMsg(billMsg, "Car not found.", false);

  const days = daysBetween(b.pickupDate, b.returnDate);
  const rentalCost = days * car.rate;
  const damage = b.inspection.damageCost || 0;
  const total = rentalCost + damage;

  invoice.innerHTML = `
    <h3>Invoice for ${b.id}</h3>
    <p><b>Customer:</b> ${escapeHtml(b.customer.name)} (${escapeHtml(b.customer.email)})</p>
    <p><b>Car:</b> ${escapeHtml(car.name)} (${car.id})</p>
    <p><b>Period:</b> ${b.pickupDate} ${b.pickupTime} → ${b.returnDate} ${b.returnTime} (${days} day(s))</p>
    <hr/>
    <p><b>Rental:</b> ${days} × ${money(car.rate)} = <b>${money(rentalCost)}</b></p>
    <p><b>Damage:</b> ${money(damage)} ${b.inspection.hasDamage ? `(${escapeHtml(b.inspection.notes || "Damage recorded")})` : "(No damage)"}</p>
    <p style="font-size:16px;"><b>Total:</b> ${money(total)}</p>
  `;
  invoice.classList.remove("hidden");

  currentInvoiceId = b.id;
  payBtn.disabled = false;
  setMsg(billMsg, "Invoice generated. Click Pay Now to complete.", true);
});

payBtn.addEventListener("click", ()=>{
  if(!currentInvoiceId) return;
  const b = findBooking(currentInvoiceId);
  if(!b) return;

  if(b.status !== "Inspected") return setMsg(billMsg, "Cannot pay at this stage.", false);

  b.status = "Paid";
  b.paid = true;

  // make car available again
  const car = findCar(b.carId);
  if(car) car.status = "Available";

  saveState(); renderAll();
  payBtn.disabled = true;
  setMsg(billMsg, `Payment successful (simulated). Booking ${b.id} completed.`, true);
});

/* ---------- Reset ---------- */
resetBtn.addEventListener("click", ()=>{
  state = structuredClone(DEFAULT_STATE);
  saveState();
  invoice.classList.add("hidden");
  payBtn.disabled = true;
  successSection.classList.add("hidden");
  renderAll();
  alert("Demo data reset.");
});

/* ---------- Render all ---------- */
function renderAll(){
  renderCarSelect();
  renderFleet();
  renderBookingsTable();
}
renderAll();
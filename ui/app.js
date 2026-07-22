const navItems = document.querySelectorAll("[data-view]")
const panels = document.querySelectorAll("[data-panel]")
const appointments = document.querySelectorAll("[data-appointment]")
const detail = document.querySelector("#appointment-detail")
const drawer = document.querySelector(".compose-drawer")
const openComposeButtons = document.querySelectorAll("[data-open-compose]")
const closeComposeButton = document.querySelector("[data-close-compose]")

const appointmentDetails = {
  1: {
    title: "Corte e barba",
    badge: "Assinante",
    badgeClass: "subscriber",
    summary: "Cliente ativo",
    quota: "Plano Corte e Barba · 2/4 usos",
    ring: "50%",
    barber: "Adriano",
    time: "09:00-09:45",
    status: "scheduled",
    source: "panel",
  },
  2: {
    title: "Barba",
    badge: "Avulso",
    badgeClass: "walkin",
    summary: "Cliente avulso",
    quota: "Sem checagem de assinatura",
    ring: "Livre",
    barber: "Antonio",
    time: "10:00-10:30",
    status: "scheduled",
    source: "panel",
  },
  3: {
    title: "Assinatura past_due",
    badge: "Bloqueado",
    badgeClass: "blocked",
    summary: "Nao confirmar",
    quota: "Regularizar assinatura antes de agendar",
    ring: "0%",
    barber: "Guilherme",
    time: "11:00",
    status: "past_due",
    source: "validacao",
  },
  4: {
    title: "Corte",
    badge: "Assinante",
    badgeClass: "subscriber",
    summary: "Cliente ativo",
    quota: "Plano Corte · 1/4 usos",
    ring: "25%",
    barber: "Paulo",
    time: "13:00-13:40",
    status: "scheduled",
    source: "panel",
  },
  5: {
    title: "Corte editado",
    badge: "Sync pendente",
    badgeClass: "pending",
    summary: "Salvo no Supabase",
    quota: "Google falhou e entrou na fila de retry",
    ring: "Retry",
    barber: "Mateus",
    time: "15:00-15:40",
    status: "scheduled",
    source: "panel",
  },
}

function showView(name) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === name))
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name))
}

function renderAppointment(id) {
  const data = appointmentDetails[id]
  if (!data || !detail) return

  detail.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Agendamento selecionado</p>
      <h2>${data.title}</h2>
    </div>
    <div class="identity-row">
      <div>
        <span class="badge ${data.badgeClass}">${data.badge}</span>
        <strong>${data.summary}</strong>
        <small>${data.quota}</small>
      </div>
      <div class="quota-ring">${data.ring}</div>
    </div>
    <dl class="facts">
      <div><dt>Barbeiro</dt><dd>${data.barber}</dd></div>
      <div><dt>Horario</dt><dd>${data.time}</dd></div>
      <div><dt>Status</dt><dd>${data.status}</dd></div>
      <div><dt>Origem</dt><dd>${data.source}</dd></div>
    </dl>
    <div class="action-stack">
      <button class="primary-button">Marcar completed</button>
      <button class="secondary-button">Editar horario</button>
      <button class="ghost-button danger-text">Cancelar sem consumir quota</button>
    </div>
  `
}

navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.view))
})

appointments.forEach((appointment) => {
  appointment.addEventListener("click", () => {
    appointments.forEach((item) => item.classList.remove("selected"))
    appointment.classList.add("selected")
    renderAppointment(appointment.dataset.appointment)
  })
})

openComposeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    drawer.hidden = false
  })
})

closeComposeButton?.addEventListener("click", () => {
  drawer.hidden = true
})

renderAppointment("1")

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ------------------------------------------------------------------ */
/* Lenis + ScrollTrigger                                               */
/* ------------------------------------------------------------------ */
const lenis = new Lenis({
  duration: 1.25,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reduceMotion,
});

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// trava o scroll até a intro terminar
lenis.stop();
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

/* ------------------------------------------------------------------ */
/* Hero: linha do horizonte                                            */
/* ------------------------------------------------------------------ */
const hero = $("[data-hero]");
const media = $("[data-hero-media]");
const layers = $$("[data-hero-layer]");
const bgImg = layers[0];
const title = $("[data-hero-title]");
const lines = $$(".hero__line", title);
const headerItems = $$(".header__inner > *");
const cards = $$("[data-card]");

// coordenadas na imagem original (1672×941)
const IMG = { w: 1672, h: 941, horizon: 765 };

// Y (em px na tela) onde fica o horizonte, respeitando object-fit: cover
let horizonY = 0;

function layoutHorizon() {
  // calcula a partir da caixa real da foto (no mobile ela é maior que a hero)
  const m = media.getBoundingClientRect();
  const box = bgImg.getBoundingClientRect();
  const posY = parseFloat(getComputedStyle(bgImg).getPropertyValue("--hero-pos-y")) / 100 || 0.7;
  const scale = Math.max(box.width / IMG.w, box.height / IMG.h);
  const offsetY = (box.height - IMG.h * scale) * posY;

  horizonY = box.top - m.top + offsetY + IMG.horizon * scale;
  media.style.setProperty("--horizon-gap", `${Math.max(0, m.height - horizonY)}px`);
}

layoutHorizon();
window.addEventListener("resize", layoutHorizon);
ScrollTrigger.addEventListener("refreshInit", layoutHorizon);

// distância até a linha ficar inteira abaixo do horizonte (escondida atrás do carro/morro)
const belowHorizon = (el) => {
  const top = el.getBoundingClientRect().top - media.getBoundingClientRect().top - (gsap.getProperty(el, "y") || 0);
  return horizonY - top + 12;
};

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */
function intro() {
  document.body.classList.remove("is-loading");

  if (reduceMotion) {
    lenis.start();
    return;
  }

  gsap.set([...headerItems, ...cards], { autoAlpha: 0 });

  // a foto já está na tela; só os textos e componentes entram
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  tl
    // o texto nasce atrás do carro e sobe até o centro
    .fromTo(
      lines,
      { y: (i, el) => belowHorizon(el) },
      { y: 0, duration: 2, stagger: 0.12 },
      0.15
    )
    .fromTo(
      headerItems,
      { autoAlpha: 0, y: -12 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, clearProps: "transform" },
      0.7
    )
    .fromTo(
      cards,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1, clearProps: "transform" },
      0.95
    );

  // libera o scroll antes do fim pra não parecer travado
  tl.call(() => lenis.start(), null, 1.2);
}

// espera fonte + imagens para a intro não "piscar" (com teto de 2.5s)
Promise.race([
  Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    ...layers.map((el) => (el.decode ? el.decode().catch(() => {}) : Promise.resolve())),
  ]),
  new Promise((resolve) => setTimeout(resolve, 2500)),
]).then(() => {
  layoutHorizon();
  intro();
});

/* ------------------------------------------------------------------ */
/* Scroll: hero fica presa, o texto volta pra trás do carro            */
/* e a próxima seção desliza por cima (só ativa quando existir uma)    */
/* ------------------------------------------------------------------ */
if (!reduceMotion && hero.nextElementSibling) {
  gsap
    .timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        pin: true,
        pinSpacing: false,
        scrub: true,
        invalidateOnRefresh: true,
      },
      defaults: { ease: "none" },
    })
    .to(title, { y: () => belowHorizon(title), duration: 0.6, ease: "power2.in" }, 0)
    .to("[data-hero-bottom]", { y: -60, autoAlpha: 0, duration: 0.4, ease: "power1.in" }, 0)
    .to("[data-hero-shade]", { "--darken": 0.75, duration: 1 }, 0);
}

/* ------------------------------------------------------------------ */
/* Header: esconde ao descer, mostra ao subir                          */
/* ------------------------------------------------------------------ */
const header = $("[data-header]");
let headerHidden = false;

lenis.on("scroll", ({ scroll, direction }) => {
  if (document.body.classList.contains("menu-open")) return;
  const shouldHide = scroll > window.innerHeight * 0.3 && direction === 1;
  if (shouldHide === headerHidden) return;
  headerHidden = shouldHide;
  gsap.to(header, { yPercent: shouldHide ? -100 : 0, duration: 0.7, ease: "power3.out" });
});

// header escuro quando estiver sobre uma seção clara (data-header-theme="light")
const lightSections = $$('[data-header-theme="light"]');

function updateHeaderTheme() {
  const y = header.offsetHeight / 2;
  const onLight = lightSections.some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= y && r.bottom >= y;
  });
  header.classList.toggle("is-dark", onLight);
}

lenis.on("scroll", updateHeaderTheme);
window.addEventListener("resize", updateHeaderTheme);

/* ------------------------------------------------------------------ */
/* Menu fullscreen                                                     */
/* ------------------------------------------------------------------ */
const menu = $("[data-menu]");
const toggle = $("[data-menu-toggle]");
const menuLinks = $$(".menu__nav a", menu);
const menuAside = $$(".menu__block", menu);

const menuTl = gsap
  .timeline({ paused: true, defaults: { ease: "expo.inOut" } })
  .set(menu, { visibility: "visible" })
  .fromTo(menu, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1 })
  .fromTo(
    menuLinks,
    { yPercent: 110 },
    { yPercent: 0, duration: 1, stagger: 0.05, ease: "expo.out" },
    0.45
  )
  .fromTo(menuAside, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "expo.out" }, 0.6);

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  menu.setAttribute("aria-hidden", String(!open));

  if (open) {
    lenis.stop();
    gsap.to(header, { yPercent: 0, duration: 0.5 });
    headerHidden = false;
    reduceMotion ? menuTl.progress(1) : menuTl.timeScale(1).play();
  } else {
    lenis.start();
    reduceMotion ? menuTl.progress(0) : menuTl.timeScale(1.6).reverse();
  }
}

toggle.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
});
menuLinks.forEach((a) => a.addEventListener("click", () => setMenu(false)));

/* ------------------------------------------------------------------ */
/* Seção 2 — Reserva                                                   */
/* ------------------------------------------------------------------ */
const booking = $("[data-booking]");

if (booking) {
  /* ---------------- seletor de data e hora personalizado ---------------- */
  const search = $("[data-search]", booking);
  const pop = $("[data-picker-pop]", booking);
  const triggers = $$("[data-picker]", booking);

  const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const DAY = 24 * 60 * 60 * 1000;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const sameDay = (a, b) => !!a && !!b && +startOfDay(a) === +startOfDay(b);
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const shortDate = (d) => `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  const nights = (a, b) => Math.max(1, Math.round((startOfDay(b) - startOfDay(a)) / DAY));

  const today = startOfDay(new Date());
  const state = {
    "pickup-date": addDays(today, 1),
    "return-date": addDays(today, 4),
    "pickup-time": "10:00",
    "return-time": "10:00",
  };

  let mode = null; // campo aberto no momento
  let view = new Date(today.getFullYear(), today.getMonth(), 1); // 1º mês exibido
  let hover = null; // dia sob o mouse enquanto escolhe a devolução

  const TIMES = [];
  for (let h = 6; h <= 23; h++) for (const m of ["00", "30"]) TIMES.push(`${pad(h)}:${m}`);

  // escreve os valores nos campos (texto visível + input escondido do form)
  function syncFields() {
    for (const [key, value] of Object.entries(state)) {
      const out = $(`[data-value="${key}"]`, booking);
      const input = $(`[data-input="${key}"]`, booking);
      if (value instanceof Date) {
        out.innerHTML = `${shortDate(value)}<small>${DOW[value.getDay()]}</small>`;
        input.value = toISO(value);
      } else {
        out.textContent = value;
        input.value = value;
      }
    }
  }

  const arrow = (dir) =>
    `<svg viewBox="0 0 24 24"><path d="${dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}" /></svg>`;

  function monthHTML(base) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const offset = new Date(y, m, 1).getDay();
    const count = new Date(y, m + 1, 0).getDate();
    const start = state["pickup-date"];
    const end = mode === "return-date" && hover && hover > start ? hover : state["return-date"];

    let cells = DOW.map((d) => `<span class="picker__dow">${d[0].toUpperCase()}</span>`).join("");
    cells += "<span></span>".repeat(offset);

    for (let d = 1; d <= count; d++) {
      const date = new Date(y, m, d);
      const cls = ["picker__day"];
      if (sameDay(date, today)) cls.push("is-today");
      if (sameDay(date, start)) cls.push("is-start", end > start ? "has-range" : "");
      if (sameDay(date, end)) cls.push("is-end");
      if (date > start && date < end) cls.push("in-range");
      const disabled = date < today || (mode === "return-date" && date < start);
      cells += `<button type="button" class="${cls.join(" ")}" data-day="${toISO(date)}" ${disabled ? "disabled" : ""}><span>${d}</span></button>`;
    }

    return `<div class="picker__month"><p class="picker__month-name">${MONTHS[m]} ${y}</p><div class="picker__grid">${cells}</div></div>`;
  }

  function renderCalendar() {
    const months = window.innerWidth > 900 ? 2 : 1;
    const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
    const n = nights(state["pickup-date"], state["return-date"]);

    let html = `<div class="picker__head">
        <span class="picker__title">${mode === "pickup-date" ? "Escolha a retirada" : "Escolha a devolução"}</span>
        <div class="picker__nav">
          <button type="button" class="picker__arrow" data-nav="-1" aria-label="Mês anterior" ${canPrev ? "" : "disabled"}>${arrow("prev")}</button>
          <button type="button" class="picker__arrow" data-nav="1" aria-label="Próximo mês">${arrow("next")}</button>
        </div>
      </div>
      <div class="picker__months">`;
    for (let i = 0; i < months; i++) html += monthHTML(new Date(view.getFullYear(), view.getMonth() + i, 1));
    html += `</div>
      <div class="picker__foot">
        <span><strong>${n} ${n === 1 ? "diária" : "diárias"}</strong> · ${shortDate(state["pickup-date"])} → ${shortDate(state["return-date"])}</span>
        <button type="button" class="picker__done" data-done>Pronto</button>
      </div>`;

    pop.className = "picker picker--date";
    pop.innerHTML = html;
  }

  function renderTimes() {
    const current = state[mode];
    pop.className = "picker picker--time";
    pop.innerHTML = `<div class="picker__head">
        <span class="picker__title">${mode === "pickup-time" ? "Horário de retirada" : "Horário de devolução"}</span>
      </div>
      <div class="picker__times" data-lenis-prevent>${TIMES.map(
        (t) => `<button type="button" class="picker__time${t === current ? " is-selected" : ""}" data-time="${t}">${t}</button>`
      ).join("")}</div>`;

    // centraliza o horário escolhido na lista
    const sel = $(".is-selected", pop);
    if (sel) sel.parentElement.scrollTop = sel.offsetTop - sel.parentElement.offsetTop - 96;
  }

  const render = () => (mode.endsWith("date") ? renderCalendar() : renderTimes());

  // posiciona o popover embaixo do campo, sem sair da barra
  function place(trigger) {
    if (window.innerWidth <= 640) {
      pop.style.left = "";
      pop.style.top = `${trigger.offsetTop + trigger.offsetHeight + 8}px`;
      return;
    }
    pop.style.top = "";
    const max = search.clientWidth - pop.offsetWidth;
    pop.style.left = `${Math.max(0, Math.min(trigger.offsetLeft, max))}px`;
  }

  function setActive(key) {
    triggers.forEach((t) => {
      const on = t.dataset.picker === key;
      t.classList.toggle("is-open", on);
      t.setAttribute("aria-expanded", String(on));
    });
  }

  function open(key) {
    const wasOpen = !!mode;
    mode = key;
    hover = null;
    if (key.endsWith("date")) {
      const d = state[key];
      view = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    render();
    setActive(key);
    place($(`[data-picker="${key}"]`, booking));
    if (!wasOpen) {
      gsap.fromTo(
        pop,
        { autoAlpha: 0, y: 10, scale: 0.98, transformOrigin: "50% 0%" },
        { autoAlpha: 1, y: 0, scale: 1, duration: reduceMotion ? 0 : 0.45, ease: "expo.out" }
      );
    }
  }

  function close() {
    if (!mode) return;
    mode = null;
    setActive(null);
    gsap.to(pop, { autoAlpha: 0, y: 6, duration: reduceMotion ? 0 : 0.2, ease: "power2.in" });
  }

  triggers.forEach((t) =>
    t.addEventListener("click", () => (mode === t.dataset.picker ? close() : open(t.dataset.picker)))
  );

  pop.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    const dayBtn = e.target.closest("[data-day]");
    const timeBtn = e.target.closest("[data-time]");

    if (nav) {
      view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.nav), 1);
      renderCalendar();
    } else if (dayBtn) {
      const date = fromISO(dayBtn.dataset.day);
      if (mode === "pickup-date") {
        state["pickup-date"] = date;
        // mantém a devolução depois da retirada
        if (state["return-date"] <= date) state["return-date"] = addDays(date, 3);
        syncFields();
        // segue direto para escolher a devolução
        mode = "return-date";
        hover = null;
        setActive(mode);
        renderCalendar();
        place($('[data-picker="return-date"]', booking));
      } else {
        state["return-date"] = date;
        syncFields();
        close();
      }
    } else if (timeBtn) {
      state[mode] = timeBtn.dataset.time;
      syncFields();
      close();
    } else if (e.target.closest("[data-done]")) {
      close();
    }
  });

  // pré-visualiza o intervalo enquanto escolhe a devolução
  pop.addEventListener("pointerover", (e) => {
    if (mode !== "return-date") return;
    const dayBtn = e.target.closest("[data-day]:not(:disabled)");
    if (!dayBtn) return;
    const date = fromISO(dayBtn.dataset.day);
    if (sameDay(date, hover)) return;
    hover = date;
    renderCalendar();
  });

  document.addEventListener("pointerdown", (e) => {
    if (mode && !pop.contains(e.target) && !e.target.closest("[data-picker]")) close();
  });
  window.addEventListener("keydown", (e) => e.key === "Escape" && close());
  window.addEventListener("resize", () => mode && open(mode));

  syncFields();

  // clicar em qualquer parte do campo de local foca o input
  $$("label[data-search-field]", booking).forEach((field) => {
    const input = $("input", field);
    field.addEventListener("click", () => input.focus());
  });

  $("[data-search]", booking).addEventListener("submit", (e) => e.preventDefault());

  if (!reduceMotion) {
    gsap
      .timeline({
        scrollTrigger: { trigger: booking, start: "top 75%", once: true },
        defaults: { ease: "expo.out" },
      })
      .from($$("[data-booking-reveal]", booking), { autoAlpha: 0, y: 40, duration: 1.3, stagger: 0.08 })
      .from($("[data-search]", booking), { autoAlpha: 0, y: 40, duration: 1.3 }, 0.15)
      .from($$("[data-search-field]", booking), { autoAlpha: 0, y: 16, duration: 1, stagger: 0.06 }, 0.3);
  }
}

/* ------------------------------------------------------------------ */
/* Seção 3 — Frota: os carros trocam conforme o scroll                 */
/* ------------------------------------------------------------------ */
const fleet = $("[data-fleet]");

if (fleet) {
  const cars = $$("[data-fleet-car]", fleet);
  const words = $$("[data-fleet-word]", fleet);
  const infos = $$("[data-fleet-info]", fleet);
  const thumbs = $$("[data-fleet-thumbs]", fleet);
  const thumbItems = thumbs.map((g) => $$("[data-fleet-thumb]", g));
  const tabs = $$("[data-fleet-tab]", fleet);
  const shadow = $("[data-fleet-shadow]", fleet);
  const tabList = $("[data-fleet-tabs]", fleet);
  const indicator = $("[data-fleet-indicator]", fleet);
  const ctaName = $("[data-fleet-cta-name]", fleet);
  const total = cars.length;

  const chars = words.map((w) => SplitText.create(w, { type: "chars", charsClass: "fleet__char" }).chars);

  // estado inicial: só o primeiro visível
  gsap.set(cars.slice(1), { autoAlpha: 0 });
  gsap.set(infos.slice(1), { autoAlpha: 0 });
  gsap.set(thumbs.slice(1), { autoAlpha: 0 });
  chars.slice(1).forEach((c) => gsap.set(c, { yPercent: 110 }));

  let active = 0;
  let swap;

  // indicador escuro desliza até o botão ativo
  function moveIndicator(i, instant = false) {
    const t = tabs[i];
    gsap.to(indicator, {
      x: t.offsetLeft,
      width: t.offsetWidth,
      duration: instant || reduceMotion ? 0 : 0.7,
      ease: "expo.out",
    });
  }

  function setUI(i) {
    tabs.forEach((t, n) => {
      const on = n === i;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    ctaName.textContent = tabs[i].textContent;
    moveIndicator(i);
    // no mobile, mantém o botão ativo visível na faixa
    const t = tabs[i];
    tabList.scrollTo({ left: t.offsetLeft - (tabList.clientWidth - t.offsetWidth) / 2, behavior: "smooth" });
  }

  moveIndicator(0, true);
  document.fonts?.ready.then(() => moveIndicator(active, true));
  window.addEventListener("resize", () => moveIndicator(active, true));

  function goTo(next) {
    if (next === active) return;
    const dir = next > active ? 1 : -1; // 1 = avançando (carros andam pra direita, pra onde apontam)
    const prev = active;
    active = next;
    setUI(next);

    // se o usuário rolar rápido, finaliza a troca anterior na hora
    if (swap) swap.progress(1).kill();

    // garante que nenhum outro carro/palavra fique "sobrando" na tela
    cars.forEach((c, n) => n !== prev && n !== next && gsap.set(c, { autoAlpha: 0 }));
    infos.forEach((c, n) => n !== prev && n !== next && gsap.set(c, { autoAlpha: 0 }));
    thumbs.forEach((c, n) => n !== prev && n !== next && gsap.set(c, { autoAlpha: 0 }));
    chars.forEach((c, n) => n !== prev && n !== next && gsap.set(c, { yPercent: 110 }));

    const travel = () => window.innerWidth * 0.65;

    if (reduceMotion) {
      gsap.set([cars[prev], infos[prev], thumbs[prev]], { autoAlpha: 0 });
      gsap.set([cars[next], infos[next], thumbs[next]], { autoAlpha: 1, x: 0 });
      gsap.set(chars[prev], { yPercent: 110 });
      gsap.set(chars[next], { yPercent: 0 });
      return;
    }

    gsap.set(cars[next], { rotate: 0 });

    swap = gsap
      .timeline()
      // carro atual acelera e sai
      .to(cars[prev], {
        x: () => dir * travel(),
        filter: "blur(10px)",
        autoAlpha: 0,
        duration: 0.75,
        ease: "power3.in",
      }, 0)
      .to(shadow, { scaleX: 0.4, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 0)
      // palavra antiga sai, nova entra (letra por letra)
      .to(chars[prev], { yPercent: -dir * 110, duration: 0.6, stagger: 0.025, ease: "power3.in" }, 0)
      .fromTo(chars[next], { yPercent: dir * 110 }, { yPercent: 0, duration: 1, stagger: 0.035, ease: "expo.out" }, 0.4)
      // novo carro chega e freia
      .fromTo(
        cars[next],
        { x: () => -dir * travel(), filter: "blur(10px)", autoAlpha: 0 },
        { x: 0, filter: "blur(0px)", autoAlpha: 1, duration: 1.15, ease: "expo.out" },
        0.45
      )
      .fromTo(shadow, { scaleX: 0.4, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 1, ease: "expo.out" }, 0.6)
      // "mergulho" da frenagem e acomodação da suspensão
      .to(cars[next], { rotate: dir * 0.9, duration: 0.22, ease: "power2.out" }, 0.95)
      .to(cars[next], { rotate: 0, duration: 1.1, ease: "elastic.out(1, 0.4)" }, 1.17)
      // infos
      .to(infos[prev], { autoAlpha: 0, y: -10, duration: 0.35, ease: "power2.in" }, 0)
      .fromTo(infos[next], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" }, 0.75)
      // galeria lateral: sai a da categoria anterior, entram os modelos da nova
      .to(thumbItems[prev], { autoAlpha: 0, y: -8, duration: 0.3, stagger: 0.03, ease: "power2.in" }, 0)
      .set(thumbs[prev], { autoAlpha: 0 }, 0.45)
      .set(thumbs[next], { autoAlpha: 1 }, 0.45)
      .fromTo(
        thumbItems[next],
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: "expo.out" },
        0.85
      );
  }

  // entrada da seção, item por item
  if (!reduceMotion) {
    gsap
      .timeline({
        scrollTrigger: { trigger: fleet, start: "top 70%", once: true },
        defaults: { ease: "expo.out" },
      })
      .from($$(".fleet__eyebrow, .fleet__title, .fleet__tab", fleet), { autoAlpha: 0, y: 30, duration: 1.2, stagger: 0.06 })
      .from(cars[0], { x: () => -window.innerWidth * 0.4, filter: "blur(10px)", autoAlpha: 0, duration: 1.6, clearProps: "filter" }, 0.25)
      .from(shadow, { scaleX: 0.4, autoAlpha: 0, duration: 1.2 }, 0.6)
      .from([$(".fleet__gallery-label", fleet), ...thumbItems[0]], { autoAlpha: 0, x: 24, duration: 1, stagger: 0.07 }, 0.6)
      .from([words[0], $(".fleet__model", infos[0]), ...$$(".fleet__specs li", infos[0]), $(".fleet__cta", fleet)], {
        autoAlpha: 0,
        y: 20,
        duration: 1,
        stagger: 0.06,
      }, 0.8);
  }

  // troca só por clique (ou setas do teclado), sem scroll automático
  tabs.forEach((tab, i) => tab.addEventListener("click", () => goTo(i)));

  tabList.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : -1) + total) % total;
    goTo(next);
    tabs[next].focus();
  });
}

/* ------------------------------------------------------------------ */
/* Seção 4 — Serviços: grade de cards                                  */
/* ------------------------------------------------------------------ */
const services = $("[data-services]");

if (services && !reduceMotion) {
  const cards = $$("[data-svc-card]", services);

  gsap
    .timeline({
      scrollTrigger: { trigger: services, start: "top 70%", once: true },
      defaults: { ease: "expo.out" },
    })
    .from($$("[data-services-reveal]", services), { autoAlpha: 0, y: 40, duration: 1.3, stagger: 0.08 })
    // cards se revelam de baixo pra cima, com a foto assentando
    .fromTo(
      cards,
      { clipPath: "inset(100% 0% 0% 0% round 1.25rem)" },
      { clipPath: "inset(0% 0% 0% 0% round 1.25rem)", duration: 1.4, stagger: 0.1, ease: "expo.inOut", clearProps: "clipPath" },
      0.1
    )
    .from($$(".svc-card__img", services), { scale: 1.25, duration: 1.8, stagger: 0.1, clearProps: "transform" }, 0.1)
    .from($$(".svc-card__title", services), { autoAlpha: 0, y: 16, duration: 1, stagger: 0.05 }, 0.8);
}

/* ------------------------------------------------------------------ */
/* Seção 5 — Perguntas frequentes                                      */
/* ------------------------------------------------------------------ */
const faq = $("[data-faq]");

if (faq) {
  const items = $$("[data-faq-item]", faq);
  const filters = $$("[data-faq-filter]", faq);
  const dur = reduceMotion ? 0 : 0.7;

  function setOpen(item, open) {
    const q = $("[data-faq-q]", item);
    const a = $("[data-faq-a]", item);
    item.classList.toggle("is-open", open);
    q.setAttribute("aria-expanded", String(open));

    gsap.killTweensOf([a, a.firstElementChild]);
    if (open) {
      gsap.fromTo(a, { height: a.offsetHeight }, { height: "auto", duration: dur, ease: "expo.out" });
      gsap.fromTo(a.firstElementChild, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: dur, delay: 0.08, ease: "expo.out" });
    } else {
      gsap.to(a, { height: 0, duration: dur * 0.75, ease: "expo.out" });
      gsap.to(a.firstElementChild, { autoAlpha: 0, duration: dur * 0.3 });
    }
  }

  // estado inicial: só o item aberto mostra a resposta
  items.forEach((item) => {
    const open = item.classList.contains("is-open");
    gsap.set($("[data-faq-a]", item), { height: open ? "auto" : 0 });
    gsap.set($("[data-faq-a] p", item), { autoAlpha: open ? 1 : 0 });
  });

  // no desktop a lista mantém a altura de "Todas" pra página não pular ao filtrar
  const list = $("[data-faq-list]", faq);
  const lockHeight = () => {
    list.style.minHeight = "";
    if (window.innerWidth > 900 && filters[0].classList.contains("is-active")) {
      list.style.minHeight = `${list.offsetHeight}px`;
    }
  };
  window.addEventListener("load", lockHeight);
  window.addEventListener("resize", lockHeight);

  // só uma resposta aberta por vez
  items.forEach((item) =>
    $("[data-faq-q]", item).addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      items.forEach((other) => other !== item && other.classList.contains("is-open") && setOpen(other, false));
      setOpen(item, willOpen);
    })
  );

  // filtros por categoria
  filters.forEach((btn) =>
    btn.addEventListener("click", () => {
      const cat = btn.dataset.faqFilter;
      filters.forEach((f) => {
        const on = f === btn;
        f.classList.toggle("is-active", on);
        f.setAttribute("aria-pressed", String(on));
      });

      // no mobile, centraliza o filtro ativo na faixa
      const strip = btn.parentElement;
      strip.scrollTo({ left: btn.offsetLeft - (strip.clientWidth - btn.offsetWidth) / 2, behavior: "smooth" });

      const show = items.filter((i) => cat === "todas" || i.dataset.cat === cat);
      items.forEach((i) => {
        const visible = show.includes(i);
        if (!visible && i.classList.contains("is-open")) setOpen(i, false);
        i.hidden = !visible;
      });

      if (!reduceMotion) {
        gsap.fromTo(show, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.05, ease: "expo.out" });
      }
      ScrollTrigger.refresh();
    })
  );

  if (!reduceMotion) {
    gsap
      .timeline({
        scrollTrigger: { trigger: faq, start: "top 70%", once: true },
        defaults: { ease: "expo.out" },
      })
      .from($$("[data-faq-reveal]:not(.faq__filters), .faq__filter", faq), { autoAlpha: 0, y: 30, duration: 1.2, stagger: 0.06 })
      .from(items, { autoAlpha: 0, y: 30, duration: 1.1, stagger: 0.06 }, 0.2);
  }
}

/* ------------------------------------------------------------------ */
/* Banner do app                                                       */
/* ------------------------------------------------------------------ */
const appBanner = $("[data-app-banner]");

if (appBanner && !reduceMotion) {
  gsap
    .timeline({
      scrollTrigger: { trigger: appBanner, start: "top 75%", once: true },
      defaults: { ease: "expo.out" },
    })
    .from("[data-app-img]", { scale: 1.12, autoAlpha: 0, duration: 1.8, transformOrigin: "70% 50%" })
    .from($$("[data-app-reveal]:not(.app-banner__stores), .store-btn", appBanner), { autoAlpha: 0, y: 30, duration: 1.2, stagger: 0.09 }, 0.25);
}

/* ------------------------------------------------------------------ */
/* Rodapé                                                              */
/* ------------------------------------------------------------------ */
const footer = $("[data-footer]");

if (footer) {
  $("[data-back-top]", footer).addEventListener("click", (e) => {
    e.preventDefault();
    lenis.scrollTo(0, { duration: 2 });
  });

  if (!reduceMotion) {
    // cada letra ganha a própria máscara, então nada fica cortado
    const chars = SplitText.create("[data-footer-word]", { type: "chars", mask: "chars", charsClass: "footer__char" }).chars;

    gsap
      .timeline({
        scrollTrigger: { trigger: footer, start: "top 75%", once: true },
        defaults: { ease: "expo.out" },
      })
      .from($$(".footer__logo, .footer__tagline, .footer__social a, .footer__heading, .footer__col li, .footer__store", footer), {
        autoAlpha: 0,
        y: 24,
        duration: 1,
        stagger: 0.035,
      })
      .from(chars, { yPercent: 110, duration: 1.4, stagger: 0.05 }, 0.4)
      .from($$(".footer__bottom > *, .footer__bottom li", footer), { autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.05 }, 0.9);
  }
}

// anchors suaves com Lenis
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    // links provisórios ("#") não fazem a página pular pro topo
    if (id === "#") {
      if (!a.hasAttribute("data-back-top")) e.preventDefault();
      return;
    }
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.6 });
  });
});

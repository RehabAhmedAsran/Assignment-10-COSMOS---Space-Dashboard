"use strict";

const NASA_API_KEY = "8TK9nBFFpNTJkbdGd8LLDdGPLHKjh6mBzjqwpRqT";

const APOD_URL = "https://api.nasa.gov/planetary/apod";
const LAUNCHES_URL = "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/";
const PLANETS_URL = "https://solar-system-opendata-proxy.vercel.app/api/planets";

const AU_KM = 149597870.7;
const IMG_DIR = "assets/images";
const LAUNCH_PLACEHOLDER = `${IMG_DIR}/launch-placeholder.png`;

let planets = [];
let launches = [];


const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const spinner = (text) => `
  <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
  <p class="text-slate-400">${text}</p>`;

const loadingBlock = (text) =>
  `<div class="col-span-full text-center py-12">${spinner(text)}</div>`;


const STATUS_COLOR = {
  Go: "green",
  Success: "green",
  TBD: "yellow",
  Hold: "red",
  TBC: "yellow",
};
const statusColor = (l) => STATUS_COLOR[l.status?.abbrev] || "blue";

                                                            /* 1- Today in Space (NASA APOD)*/
function getApodVideo() {
  let v = $("apod-video");
  if (!v) {
    v = document.createElement("iframe");
    v.id = "apod-video";
    v.className = "w-full h-full hidden";
    v.setAttribute("frameborder", "0");
    v.setAttribute("allowfullscreen", "");
    $("apod-image").after(v);
  }
  return v;
}

async function loadApod(date = null) {
  const container = $("apod-image-container");
  const loading = $("apod-loading");
  const img = $("apod-image");
  const overlay = container.querySelector(".absolute.inset-0");
  const video = getApodVideo();

  loading.innerHTML = spinner("Loading today's image...");
  loading.classList.remove("hidden");
  img.classList.add("hidden");
  img.src = "";
  video.classList.add("hidden");
  video.src = "";
  overlay && overlay.classList.add("hidden");

  try {
    let url = `${APOD_URL}?api_key=${NASA_API_KEY}`;
    if (date) url += `&date=${date}`;
    const d = await fetchJSON(url);

    const prettyDate = new Date(d.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    $("apod-date").textContent = `Astronomy Picture of the Day - ${prettyDate}`;
    $("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${prettyDate}`;
    $("apod-date-info").textContent = prettyDate;

    $("apod-title").textContent = d.title;
    $("apod-explanation").textContent = d.explanation;

    const copyright = $("apod-copyright");
    if (d.copyright) {
      copyright.innerHTML = `<i class="fas fa-copyright mr-1"></i>Copyright: ${esc(
        d.copyright.trim()
      )}`;
      copyright.classList.remove("hidden");
    } else {
      copyright.classList.add("hidden");
    }

    $("apod-media-type").textContent = d.media_type === "image" ? "Image" : "Video";

    if (d.media_type === "image") {
      img.onload = () => {
        loading.classList.add("hidden");
        img.classList.remove("hidden");
      };
      img.onerror = () => {
        loading.innerHTML = `
          <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
          <p class="text-slate-400">Failed to load image</p>`;
      };
      img.alt = d.title;
      img.src = d.url;

      if (overlay) {
        overlay.classList.remove("hidden");
        const btn = overlay.querySelector("button");
        if (btn) btn.onclick = () => window.open(d.hdurl || d.url, "_blank");
      }
    } else if (d.media_type === "video") {
      loading.classList.add("hidden");
      video.src = d.url;
      video.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Error fetching APOD:", err);
    loading.classList.remove("hidden");
    loading.innerHTML = `
      <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
      <p class="text-slate-400">Failed to load today's image</p>
      <p class="text-slate-500 text-sm mt-2">Please try again later</p>`;
  }
}

function initApodControls() {
  const input = $("apod-date-input");
  const wrapper = input.closest(".date-input-wrapper");
  const loadBtn = $("load-date-btn");
  const todayBtn = $("today-apod-btn");

  const toISO = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
      dt.getDate()
    ).padStart(2, "0")}`;

  const setLabel = (value) => {
    if (!value) return wrapper.setAttribute("data-date", "Select a date");
    const label = new Date(value + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    wrapper.setAttribute("data-date", label);
  };

  const today = toISO(new Date());
  input.max = today;
  input.value = today;
  setLabel(today);

  input.addEventListener("change", () => setLabel(input.value));
  loadBtn.addEventListener("click", () => input.value && loadApod(input.value));
  todayBtn.addEventListener("click", () => {
    input.value = today;
    setLabel(today);
    loadApod(null);
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value) loadApod(input.value);
  });
}

                                          /* 2- Launches (SpaceDevs)*/
async function loadLaunches() {
  const featured = $("featured-launch");
  const grid = $("launches-grid");
  featured.innerHTML = loadingBlock("Loading launches...");
  grid.innerHTML = "";

  try {
    launches = (await fetchJSON(`${LAUNCHES_URL}?limit=10`)).results;

    const c1 = $("launches-count");
    const c2 = $("launches-count-mobile");
    if (c1) c1.textContent = `${launches.length} Launches`;
    if (c2) c2.textContent = `${launches.length}`;

    renderFeaturedLaunch();
    renderLaunchesGrid();
  } catch (err) {
    console.error("Error fetching launches data:", err);
    const errorHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fas fa-exclamation-triangle text-red-400 text-5xl mb-4"></i>
        <p class="text-slate-400 text-lg">Failed to load launches data</p>
        <p class="text-slate-500 text-sm mt-2">Please try again later</p>
      </div>`;
    featured.innerHTML = errorHTML;
    grid.innerHTML = errorHTML;
  }
}

function renderFeaturedLaunch() {
  const el = $("featured-launch");
  if (!el || launches.length === 0) return;

  const l = launches[0];
  const date = new Date(l.net);
  const days = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr =
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  const color = statusColor(l);
  const image = l.image?.image_url || l.rocket?.configuration?.image_url || "";

  el.innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>
                Featured Launch
              </span>
              <span class="px-4 py-1.5 bg-${color}-500/20 text-${color}-400 rounded-full text-sm font-semibold">
                ${esc(l.status?.abbrev || "TBD")}
              </span>
            </div>

            <h3 class="text-3xl font-bold mb-3 leading-tight">${esc(l.name)}</h3>

            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2">
                <i class="fas fa-building"></i>
                <span>${esc(l.launch_service_provider?.name || "Unknown")}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-rocket"></i>
                <span>${esc(l.rocket?.configuration?.name || "N/A")}</span>
              </div>
            </div>

            ${
              days > 0
                ? `
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${days}</p>
                <p class="text-xs text-slate-400">Days Until Launch</p>
              </div>
            </div>`
                : ""
            }

            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i> Launch Date</p>
                <p class="font-semibold">${dateStr}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i> Launch Time</p>
                <p class="font-semibold">${timeStr}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Location</p>
                <p class="font-semibold text-sm">${esc(l.pad?.location?.name || "Unknown")}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i> Country</p>
                <p class="font-semibold">${esc(l.pad?.location?.country?.name || "Unknown")}</p>
              </div>
            </div>

            <p class="text-slate-300 leading-relaxed mb-6">
              ${esc(l.mission?.description || "Mission details will be available closer to launch date.")}
            </p>
          </div>

          <div class="flex flex-col md:flex-row gap-3">
            <button class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>
              View Full Details
            </button>
            <div class="icons self-end md:self-center">
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="fas fa-bell"></i></button>
            </div>
          </div>
        </div>

        <div class="relative">
          ${
            image
              ? `
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            <img src="${esc(image)}" alt="${esc(l.name)}" class="w-full h-full object-cover"
                 onerror="this.onerror=null; this.src='${LAUNCH_PLACEHOLDER}';" />
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>`
              : `
          <div class="flex items-center justify-center h-full min-h-[400px] bg-slate-900/50 rounded-2xl">
            <div class="text-center">
              <i class="fas fa-rocket text-6xl text-slate-700 mb-4"></i>
              <p class="text-slate-500">No image available</p>
            </div>
          </div>`
          }
        </div>
      </div>
    </div>`;
}

function renderLaunchesGrid() {
  const grid = $("launches-grid");
  if (!grid || launches.length === 0) return;

  grid.innerHTML = launches
    .slice(1, 10)
    .map((l) => {
      const date = new Date(l.net);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeStr =
        date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " UTC";
      const color = statusColor(l);
      const thumb = l.image?.thumbnail_url || "";
      const badge = `
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 bg-${color}-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">
            ${esc(l.status?.abbrev || "TBD")}
          </span>
        </div>`;

      return `
      <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
        ${
          thumb
            ? `
        <div class="relative h-48 overflow-hidden bg-slate-900/50">
          <img src="${esc(thumb)}" alt="${esc(l.name)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
               onerror="this.onerror=null; this.src='${LAUNCH_PLACEHOLDER}';" />
          ${badge}
        </div>`
            : `
        <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
          <i class="fas fa-rocket text-5xl text-slate-700"></i>
          ${badge}
        </div>`
        }
        <div class="p-5">
          <div class="mb-3">
            <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${esc(l.name)}</h4>
            <p class="text-sm text-slate-400 flex items-center gap-2">
              <i class="fas fa-building text-xs"></i>
              ${esc(l.launch_service_provider?.name || "Unknown")}
            </p>
          </div>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${dateStr}</span></div>
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${timeStr}</span></div>
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-rocket text-slate-500 w-4"></i><span class="text-slate-300">${esc(l.rocket?.configuration?.name || "N/A")}</span></div>
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${esc(l.pad?.location?.name || "Unknown")}</span></div>
          </div>
          <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
            <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
            <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

                                              /*  3- Planets (Solar System OpenData proxy) */
const CARD_COLORS = {
  mercury: "#eab308",
  venus: "#f97316",
  earth: "#3b82f6",
  mars: "#ef4444",
  jupiter: "#fb923c",
  saturn: "#facc15",
  uranus: "#06b6d4",
  neptune: "#2563eb",
};
const TABLE_COLORS = {
  mercury: "#6b7280",
  venus: "#fb923c",
  earth: "#3b82f6",
  mars: "#ef4444",
  jupiter: "#fdba74",
  saturn: "#fde047",
  uranus: "#22d3ee",
  neptune: "#2563eb",
};

const PLANET_DESCRIPTIONS = {
  earth:
    "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 29% of Earth's surface is land consisting of continents and islands. The remaining 71% is covered with water.",
  mars:
    'Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. Named after the Roman god of war, it is often referred to as the "Red Planet" due to its reddish appearance.',
  jupiter:
    "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass one-thousandth that of the Sun, but two-and-a-half times that of all the other planets combined.",
  saturn:
    "Saturn is the sixth planet from the Sun and the second-largest in the Solar System. It is a gas giant with an average radius about nine times that of Earth, and is best known for its extensive ring system.",
  venus:
    "Venus is the second planet from the Sun. It is named after the Roman goddess of love and beauty. As the second-brightest natural object in the night sky after the Moon, Venus can cast shadows.",
  mercury:
    "Mercury is the smallest planet in the Solar System and the closest to the Sun. Its orbit around the Sun takes 87.97 Earth days, the shortest of all the planets in the Solar System.",
  uranus:
    "Uranus is the seventh planet from the Sun. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System. Uranus is unique in that it rotates on its side.",
  neptune:
    "Neptune is the eighth and farthest known planet from the Sun in the Solar System. It is the fourth-largest planet by diameter and the third-most-massive planet.",
};

const slug = (p) => p.englishName.toLowerCase();

async function loadPlanets() {
  const grid = $("planets-grid");
  grid.innerHTML = loadingBlock("Loading planets...");

  try {
    const data = await fetchJSON(PLANETS_URL);
    
    planets = data.bodies.filter((b) => b.isPlanet === true);

    renderPlanetCards();
    renderComparisonTable();

    const earth = planets.find((p) => slug(p) === "earth");
    if (earth) showPlanetDetails(earth);
  } catch (err) {
    console.error("Error fetching planets data:", err);
    grid.innerHTML = `
      <div class="col-span-full text-center py-8">
        <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-4"></i>
        <p class="text-slate-400">Failed to load planets data. Please try again later.</p>
      </div>`;
  }
}

function renderPlanetCards() {
  const grid = $("planets-grid");
  grid.innerHTML = planets
    .map((p) => {
      const key = slug(p);
      const color = CARD_COLORS[key] || "#64748b";
      const au = (p.semimajorAxis / AU_KM).toFixed(2);
      return `
      <div class="planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group"
           data-planet-id="${esc(p.id)}" style="--planet-color: ${color}"
           onmouseover="this.style.borderColor='${color}80'" onmouseout="this.style.borderColor='#334155'">
        <div class="relative mb-3 h-24 flex items-center justify-center">
          <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform"
               src="${IMG_DIR}/${key}.png" alt="${esc(p.englishName)}" />
        </div>
        <h4 class="font-semibold text-center text-sm">${esc(p.englishName)}</h4>
        <p class="text-xs text-slate-400 text-center">${au} AU</p>
      </div>`;
    })
    .join("");

  grid.querySelectorAll(".planet-card").forEach((card) => {
    card.addEventListener("click", () => {
      const p = planets.find((x) => x.id === card.dataset.planetId);
      if (p) showPlanetDetails(p);
    });
  });
}

function renderComparisonTable() {
  const tbody = $("planet-comparison-tbody");
  if (!tbody) return;

  const earth = planets.find((p) => slug(p) === "earth");
  const earthMass = earth?.mass
    ? earth.mass.massValue * Math.pow(10, earth.mass.massExponent)
    : 1;

  const td =
    "px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap";

  tbody.innerHTML = planets
    .map((p) => {
      const key = slug(p);
      const color = TABLE_COLORS[key] || "#64748b";
      const au = (p.semimajorAxis / AU_KM).toFixed(2);
      const diameter = (p.meanRadius * 2).toFixed(0);
      const massRatio = (
        (p.mass ? p.mass.massValue * Math.pow(10, p.mass.massExponent) : 0) /
        earthMass
      ).toFixed(3);

      let period = p.sideralOrbit.toFixed(0);
      period =
        p.sideralOrbit > 365
          ? `${(p.sideralOrbit / 365.25).toFixed(1)} years`
          : `${period} days`;

      const moons = p.moons ? p.moons.length : 0;

      let type = "Terrestrial",
        bg = "#f9731680",
        fg = "#fb923c";
      if (["jupiter", "saturn"].includes(key)) {
        type = "Gas Giant";
        bg = "#a855f780";
        fg = "#c084fc";
      } else if (["uranus", "neptune"].includes(key)) {
        type = "Ice Giant";
        bg = "#3b82f680";
        fg = "#60a5fa";
      }

      return `
      <tr class="${
        key === "earth"
          ? "hover:bg-slate-800/30 transition-colors bg-blue-500/5"
          : "hover:bg-slate-800/30 transition-colors"
      }">
        <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
          <div class="flex items-center space-x-2 md:space-x-3">
            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
            <span class="font-semibold text-sm md:text-base whitespace-nowrap">${esc(p.englishName)}</span>
          </div>
        </td>
        <td class="${td}">${au}</td>
        <td class="${td}">${parseInt(diameter).toLocaleString()}</td>
        <td class="${td}">${massRatio}</td>
        <td class="${td}">${period}</td>
        <td class="${td}">${moons}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
          <span class="px-2 py-1 rounded text-xs" style="background-color: ${bg}; color: ${fg}">${type}</span>
        </td>
      </tr>`;
    })
    .join("");
}

function buildFacts(p) {
  const mass = p.mass ? `Mass: ${p.mass.massValue} × 10^${p.mass.massExponent} kg` : "";
  const gravity = p.gravity ? `Surface gravity: ${p.gravity} m/s²` : "";
  const density = p.density ? `Density: ${p.density} g/cm³` : "";
  const discoverer = p.discoveredBy ? `Discovered by: ${p.discoveredBy}` : "";

  const facts = [];
  if (mass) facts.push(mass);
  if (gravity) facts.push(gravity);
  if (density) facts.push(density);
  if (p.axialTilt) facts.push(`Axial tilt: ${p.axialTilt}°`);
  if (discoverer) facts.push(discoverer);
  if (facts.length < 3) {
    facts.push(`Mean radius: ${p.meanRadius.toFixed(0)} km`);
    if (p.moons) facts.push(`Has ${p.moons.length} moon(s)`);
  }
  return facts.slice(0, 4);
}

function showPlanetDetails(p) {
  const key = slug(p);
  const set = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  const img = $("planet-detail-image");
  if (img) {
    img.src = `${IMG_DIR}/${key}.png`;
    img.alt = p.englishName;
  }
  set("planet-detail-name", p.englishName);
  set(
    "planet-detail-description",
    PLANET_DESCRIPTIONS[key] ||
      `${p.englishName} is a fascinating celestial body in our Solar System with unique characteristics.`
  );

  const distance = (p.semimajorAxis / 1e6).toFixed(1);
  const radius = p.meanRadius ? p.meanRadius.toFixed(0) : "N/A";
  const mass = p.mass ? `${p.mass.massValue} × 10^${p.mass.massExponent}` : "N/A";
  const density = p.density ? p.density.toFixed(2) : "N/A";
  const orbit = p.sideralOrbit ? p.sideralOrbit.toFixed(2) : "N/A";
  const rotation = p.sideralRotation ? p.sideralRotation.toFixed(2) : "N/A";
  const moons = p.moons ? p.moons.length : 0;
  const gravity = p.gravity ? p.gravity.toFixed(2) : "N/A";

  set("planet-distance", `${distance}M km`);
  set("planet-radius", `${radius} km`);
  set("planet-mass", `${mass} kg`);
  set("planet-density", `${density} g/cm³`);
  set("planet-orbital-period", orbit === "N/A" ? "N/A" : `${orbit} days`);
  set("planet-rotation", rotation === "N/A" ? "N/A" : `${rotation} hours`);
  set("planet-moons", moons);
  set("planet-gravity", gravity === "N/A" ? "N/A" : `${gravity} m/s²`);

  set("planet-discoverer", p.discoveredBy || "Known since antiquity");
  set("planet-discovery-date", p.discoveryDate || "Ancient times");
  set("planet-body-type", p.bodyType || "Planet");
  set("planet-volume", p.vol ? `${p.vol.volValue} × 10^${p.vol.volExponent} km³` : "N/A");

  set("planet-perihelion", p.perihelion ? `${(p.perihelion / 1e6).toFixed(1)}M km` : "N/A");
  set("planet-aphelion", p.aphelion ? `${(p.aphelion / 1e6).toFixed(1)}M km` : "N/A");
  set("planet-eccentricity", p.eccentricity ? p.eccentricity.toFixed(5) : "N/A");
  set("planet-inclination", p.inclination ? `${p.inclination.toFixed(2)}°` : "N/A");
  set("planet-axial-tilt", p.axialTilt ? `${p.axialTilt.toFixed(2)}°` : "N/A");
  set("planet-temp", p.avgTemp ? `${p.avgTemp}°C` : "N/A");
  set("planet-escape", p.escape ? `${(p.escape / 1e3).toFixed(2)} km/s` : "N/A");

  $("planet-facts").innerHTML = buildFacts(p)
    .map(
      (f) => `
      <li class="flex items-start">
        <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
        <span class="text-slate-300">${esc(f)}</span>
      </li>`
    )
    .join("");
}

                                                                  /* 4- Navigation + Sidebar */
function initNavigation() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".app-section");

  function show(name) {
    sections.forEach((s) => s.classList.add("hidden"));
    document
      .querySelectorAll(`[data-section="${name}"].app-section`)
      .forEach((s) => s.classList.remove("hidden"));

    links.forEach((l) => {
      if (l.dataset.section === name) {
        l.classList.remove("text-slate-300", "hover:bg-slate-800");
        l.classList.add("bg-blue-500/10", "text-blue-400");
      } else {
        l.classList.remove("bg-blue-500/10", "text-blue-400");
        l.classList.add("text-slate-300", "hover:bg-slate-800");
      }
    });
    window.scrollTo(0, 0);
  }

  links.forEach((l) =>
    l.addEventListener("click", (e) => {
      e.preventDefault();
      show(l.dataset.section);
      closeSidebar();
    })
  );

  show("today-in-space");
}

let overlayEl = null;
function openSidebar() {
  $("sidebar").classList.add("sidebar-open");
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.className = "sidebar-overlay";
    overlayEl.addEventListener("click", closeSidebar);
    document.body.appendChild(overlayEl);
  }
}
function closeSidebar() {
  $("sidebar").classList.remove("sidebar-open");
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}
function initSidebar() {
  $("sidebar-toggle").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    $("sidebar").classList.contains("sidebar-open") ? closeSidebar() : openSidebar();
  });
}


document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initSidebar();
  initApodControls();
  loadApod();
  loadPlanets();
  loadLaunches();
});
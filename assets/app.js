(function () {
  const { getStore, createFeedback, analyzePlanner } = window.tripPlannerStore;

  const heroMeta = document.getElementById("hero-trip-meta");
  const overviewRoot = document.getElementById("overview-root");
  const overviewFlights = document.getElementById("overview-flights");
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackList = document.getElementById("feedback-list");
  const hotelGuideRoot = document.getElementById("hotel-guide-root");
  const ticketGuideRoot = document.getElementById("ticket-guide-root");
  const connectivityGuideRoot = document.getElementById("connectivity-guide-root");
  const mapGuideRoot = document.getElementById("map-guide-root");
  function blockKindLabel(type) {
    if (type === "flight") return "航班";
    if (type === "transport") return "交通";
    return "景點";
  }

  function renderMenu() {
    document.querySelectorAll(".menu-button").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.menuTarget;
        document.querySelectorAll(".menu-button").forEach((item) => item.classList.toggle("active", item === button));
        document
          .querySelectorAll(".menu-panel")
          .forEach((panel) => panel.classList.toggle("active", panel.dataset.menuPanel === target));
      });
    });
  }


  function renderHero() {
    const { planner } = getStore();
    heroMeta.innerHTML = `
      <li><strong>日期：</strong>${planner.startDate} 到 ${planner.endDate}</li>
      <li><strong>城市：</strong>${planner.city}</li>
      <li><strong>備註：</strong>${planner.generalNotes}</li>
    `;
  }

  function renderBlock(block, index) {
    if (block.type === "transport") {
      return `
        <div class="time-block transport">
          <div class="time-badge">${block.startTime} - ${block.endTime}</div>
          <div>
            <div class="chip-row">
              <span class="chip">${blockKindLabel(block.type)}</span>
              <span class="chip">${block.transportMode}</span>
              <span class="chip">${block.durationMinutes} 分鐘</span>
            </div>
            <h4>${index + 1}. ${block.title}</h4>
            <p class="small"><strong>路線：</strong>${block.from || "上一站"} -> ${block.to || "下一站"}</p>
            <p class="small"><strong>方式：</strong>${block.notes}</p>
            <p class="small"><strong>提醒：</strong>${block.caution}</p>
          </div>
        </div>
      `;
    }

    if (block.type === "flight") {
      return `
        <div class="time-block flight">
          <div class="time-badge">${block.startTime} - ${block.endTime}</div>
          <div>
            <div class="chip-row">
              <span class="chip">${blockKindLabel(block.type)}</span>
              <span class="chip">${block.travelerName}</span>
              <span class="chip">${block.flightNumber || "待補班號"}</span>
            </div>
            <h4>${index + 1}. ${block.title}</h4>
            <p class="small"><strong>航線：</strong>${block.route || "待補"}</p>
            <p class="small"><strong>機場 / 航廈：</strong>${block.terminal || "待補"}</p>
            <p class="small"><strong>備註：</strong>${block.notes || "無"}</p>
            <p class="small"><strong>提醒：</strong>${block.caution}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="time-block activity">
        <div class="time-badge">${block.startTime} - ${block.endTime}</div>
        <div>
          <div class="chip-row">
            <span class="chip">${blockKindLabel(block.type)}</span>
            ${block.tags.map((tag) => `<span class="chip">${tag}</span>`).join("")}
          </div>
          <h4>${index + 1}. ${block.title}</h4>
          <p class="small"><strong>景點：</strong>${block.place}</p>
          <p class="small"><strong>交通：</strong>${block.transit}</p>
          <p class="small"><strong>營業：</strong>${block.businessHours}</p>
          <p class="small"><strong>提醒：</strong>${block.caution}</p>
          <p class="small"><a class="link" href="${block.mapUrl}" target="_blank" rel="noreferrer">開啟地圖連結</a></p>
        </div>
      </div>
    `;
  }

  async function renderOverview() {
    const { planner } = getStore();
    const checks = analyzePlanner(planner).filter((item) => item.level === "warn" || item.level === "error");
    const routeResults = await Promise.all(
      planner.days.map(async (day) => {
        try {
          const response = await fetch("/api/naver/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day })
          });
          return await response.json();
        } catch {
          return null;
        }
      })
    );

    overviewFlights.innerHTML = `
      <span class="chip">Day 1 去程：${planner.flights.outbound}</span>
      <span class="chip">Day 2 朋友加入：${planner.flights.friendJoin}</span>
      <span class="chip">Day 4 回程：${planner.flights.inbound}</span>
    `;

    overviewRoot.innerHTML = `
      <div class="overview-grid">
        <div class="stack">
          ${planner.days
            .map(
              (day) => `
              <article class="day-preview-card">
                <div class="row-between">
                  <div>
                    <h3>${day.label}</h3>
                    <p class="meta">${day.blocks.map((block) => block.title).join(" -> ") || "尚未安排"}</p>
                  </div>
                  <span class="chip">${day.blocks.length} 個區塊</span>
                </div>
                <div class="timeline-blocks">
                  ${day.blocks.map(renderBlock).join("")}
                </div>
              </article>
            `
            )
            .join("")}
        </div>
        <aside class="map-panel">
          <article class="info-card">
            <p class="section-kicker">地圖路線預覽</p>
            <h3>每日路線側欄</h3>
            <p class="small muted">目前先顯示每日站點摘要與地圖導覽。之後要串接正式路線 API，也可以再切換成 Google Maps Directions 或其他地圖服務。</p>
          </article>
          ${planner.days
            .map((day, index) => {
              const route = routeResults[index]?.summary;
              return `
              <article class="route-card">
                <h4>${day.label}</h4>
                <ol class="route-points">
                  ${(route?.stops || day.blocks.filter((block) => block.type === "activity").map((block) => ({ name: block.place })))
                    .map((stop) => `<li>${stop.name}</li>`)
                    .join("")}
                </ol>
                <p class="small muted">
                  ${
                    route?.durationMs
                      ? `估計路線時間：約 ${Math.round(route.durationMs / 60000)} 分鐘`
                      : "交通與航班區塊已保留在時間軸中，地圖側欄只標活動點位。"
                  }
                </p>
              </article>
            `;
            })
            .join("")}
          <article class="info-card">
            <p class="section-kicker">AI 提醒</p>
            ${
              checks.length
                ? `<ul class="notes">${checks.map((item) => `<li>${item.title}：${item.message}</li>`).join("")}</ul>`
                : `<p class="small muted">目前沒有明顯衝突。</p>`
            }
          </article>
        </aside>
      </div>
    `;
  }

  function renderFeedbackList() {
    const { feedbackSubmissions } = getStore();
    feedbackList.innerHTML = feedbackSubmissions.length
      ? feedbackSubmissions
          .map(
            (item) => `
            <article class="submission-card">
              <div class="row-between">
                <strong>${item.requesterName}</strong>
                <span class="status ${item.status}">${item.status}</span>
              </div>
              <p class="small"><strong>調整日期：</strong>${item.targetDay || "整體行程"}</p>
              <p class="small"><strong>景點 / 活動：</strong>${item.requestedPlaces.replace(/\n/g, "、")}</p>
              <p class="small"><strong>需求：</strong>${item.requestMessage}</p>
              <p class="small"><strong>限制：</strong>${item.constraints || "無"}</p>
            </article>
          `
          )
          .join("")
      : `<div class="empty-state">目前還沒有朋友送出的修改需求。</div>`;
  }

  function buildHotelLink(platform, hotelName) {
    const query = encodeURIComponent(`${hotelName} Busan`);
    if (platform === "agoda") {
      return `https://www.agoda.com/search?textToSearch=${query}`;
    }
    if (platform === "trip") {
      return `https://tw.trip.com/hotels/list?keyword=${query}`;
    }
    if (platform === "google") {
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    return `https://www.google.com/search?q=${query}`;
  }

  function renderHotelGuide() {
    const { guides } = getStore();
    hotelGuideRoot.innerHTML = `
      <div class="hotel-guide-shell">
        <article class="info-card">
          <p class="section-kicker">使用方式</p>
          <h3>先選區域，再挑住宿風格</h3>
          <p class="small muted">這頁是依照你提供的參考網站整理成你自己的版本，保留地區分類、飯店卡片與外部連結結構，方便直接放進你的行程網站菜單下。</p>
        </article>
        <div class="area-shortcuts">
          ${guides.hotels
            .map((section) => `<a class="area-chip" href="#hotel-${section.area}">${section.area}</a>`)
            .join("")}
        </div>
        ${guides.hotels
          .map(
            (section) => `
            <section class="hotel-section" id="hotel-${section.area}">
              <div class="row-between">
                <div>
                  <h3>${section.area}</h3>
                  <p class="meta">${section.intro}</p>
                </div>
                <a class="ghost area-top-link" href="#top">回到上方</a>
              </div>
              <div class="hotel-card-grid">
                ${section.hotels
                  .map(
                    (hotel) => `
                    <article class="hotel-card">
                      <div class="chip-row">
                        <span class="chip">${section.area}</span>
                        <span class="chip">${hotel.stars}</span>
                      </div>
                      <h4>${hotel.name}</h4>
                      <p class="small">${hotel.summary}</p>
                      <div class="hotel-links">
                        <a class="link-button" href="${buildHotelLink("agoda", hotel.name)}" target="_blank" rel="noreferrer">Agoda</a>
                        <a class="link-button" href="${buildHotelLink("trip", hotel.name)}" target="_blank" rel="noreferrer">Trip.com</a>
                        <a class="link-button" href="${buildHotelLink("google", hotel.name)}" target="_blank" rel="noreferrer">Google 地圖</a>
                        <a class="link-button" href="${buildHotelLink("search", hotel.name)}" target="_blank" rel="noreferrer">Google 搜尋</a>
                      </div>
                    </article>
                  `
                  )
                  .join("")}
              </div>
            </section>
          `
          )
          .join("")}
      </div>
    `;
  }

  function buildSearchLink(keyword, site) {
    const q = encodeURIComponent(keyword);
    if (site === "kkday") return `https://www.kkday.com/zh-tw/product/search?keyword=${q}`;
    if (site === "klook") return `https://www.klook.com/zh-TW/search/result/?query=${q}`;
    if (site === "trip") return `https://tw.trip.com/travel-guide/search/?query=${q}`;
    if (site === "google-map") return `https://www.google.com/maps/search/?api=1&query=${q}`;
    return `https://www.google.com/search?q=${q}`;
  }

  function renderTicketGuide() {
    const { guides } = getStore();
    ticketGuideRoot.innerHTML = `
      <div class="guide-shell">
        <article class="info-card">
          <p class="section-kicker">頁面分析</p>
          <p class="small muted">你提供的參考站核心是「票券清單 + 購買平台連結 + 地圖連結 + 是否適合搭配 Pass」。我已把它整理成你網站自己的導覽卡片版本。</p>
        </article>
        <div class="hotel-card-grid">
          ${guides.tickets
            .map(
              (ticket) => `
              <article class="hotel-card">
                <div class="chip-row">
                  <span class="chip">票券</span>
                  <span class="chip">${ticket.pass}</span>
                </div>
                <h4>${ticket.name}</h4>
                <p class="small">${ticket.summary}</p>
                <div class="hotel-links">
                  <a class="link-button" href="${buildSearchLink(ticket.name, "kkday")}" target="_blank" rel="noreferrer">KKDAY</a>
                  <a class="link-button" href="${buildSearchLink(ticket.name, "klook")}" target="_blank" rel="noreferrer">KLOOK</a>
                  <a class="link-button" href="${buildSearchLink(ticket.name, "trip")}" target="_blank" rel="noreferrer">Trip.com</a>
                  <a class="link-button" href="${buildSearchLink(ticket.name, "google-map")}" target="_blank" rel="noreferrer">Google 地圖</a>
                </div>
              </article>
            `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderConnectivityGuide() {
    const { guides } = getStore();
    connectivityGuideRoot.innerHTML = `
      <div class="guide-shell">
        ${guides.connectivity
          .map(
            (section) => `
            <section class="hotel-section">
              <div>
                <h3>${section.category}</h3>
              </div>
              <div class="hotel-card-grid">
                ${section.items
                  .map(
                    (item) => `
                    <article class="hotel-card">
                      <div class="chip-row">
                        <span class="chip">${section.category}</span>
                      </div>
                      <h4>${item.name}</h4>
                      <p class="small">${item.summary}</p>
                    </article>
                  `
                  )
                  .join("")}
              </div>
            </section>
          `
          )
          .join("")}
      </div>
    `;
  }

  function renderMapGuide() {
    const { guides } = getStore();
    mapGuideRoot.innerHTML = `
      <div class="guide-shell">
        <article class="info-card">
          <p class="section-kicker">地圖說明</p>
          <p class="small muted">這裡直接嵌入你提供的 Google My Maps。之後也可以再把住宿、票券、景點分成不同圖層去看。</p>
        </article>
        <div class="map-embed-shell">
          ${guides.mapEmbed}
        </div>
      </div>
    `;
  }

  feedbackForm.addEventListener("submit", async (event) => {
     event.preventDefault();
     const formData = new FormData(feedbackForm);
     const payload = Object.fromEntries(formData.entries());
     
     try {
       const response = await fetch("/api/feedback", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload)
       });
       
       if (response.ok) {
         createFeedback(payload);
         feedbackForm.reset();
         renderFeedbackList();
         alert("修改需求已送到後台審核。");
       } else {
         alert("提交失敗，請稍後重試。");
       }
     } catch (error) {
       console.error("提交錯誤：", error);
       createFeedback(payload);
       feedbackForm.reset();
       alert("已本地暫存，稍後會同步到後台。");
     }
   });

  renderMenu();
  renderHero();
  renderOverview();
  renderHotelGuide();
  renderTicketGuide();
  renderConnectivityGuide();
  renderMapGuide();
  renderFeedbackList();
})();

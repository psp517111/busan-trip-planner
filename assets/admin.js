(function () {
  const {
    getStore,
    savePlannerMeta,
    addPlannerBlock,
    updatePlannerBlock,
    deletePlannerBlock,
    movePlannerBlock,
    moveBlockAcrossDays,
    updateGuideSection,
    addGuideSection,
    deleteGuideSection,
    moveGuideSection,
    addGuideItem,
    updateGuideItem,
    deleteGuideItem,
    moveGuideItem,
    updateMapEmbed,
    updateFeedbackStatus,
    analyzePlanner
  } = window.tripPlannerStore;

  const metaForm = document.getElementById("planner-meta-form");
  const itemForm = document.getElementById("item-form");
  const itemDaySelect = document.getElementById("item-day-select");
  const dayTabsRoot = document.getElementById("day-tabs-root");
  const plannerEditorRoot = document.getElementById("planner-editor-root");
  const aiCheckRoot = document.getElementById("ai-check-root");
  const feedbackReviewRoot = document.getElementById("feedback-review-root");
  const apiSettingsForm = document.getElementById("api-settings-form");
  const apiSettingsStatus = document.getElementById("api-settings-status");
  const guideEditorRoot = document.getElementById("guide-editor-root");

  let activeDayId = "day-1";
  let draggingBlock = null;

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function mapLevelToStatus(level) {
    if (level === "error") return "rejected";
    if (level === "warn") return "pending";
    return "approved";
  }

  function renderMetaForm() {
    const { planner } = getStore();
    metaForm.title.value = planner.title;
    metaForm.city.value = planner.city;
    metaForm.startDate.value = planner.startDate;
    metaForm.endDate.value = planner.endDate;
    metaForm.outboundFlight.value = planner.flights.outbound;
    metaForm.inboundFlight.value = planner.flights.inbound;
    metaForm.friendJoinFlight.value = planner.flights.friendJoin;
    metaForm.generalNotes.value = planner.generalNotes;
    metaForm.geminiBaseUrl.value = planner.apiConfig.geminiBaseUrl;
    metaForm.naverMapBaseUrl.value = planner.apiConfig.naverMapBaseUrl;
    metaForm.flightBaseUrl.value = planner.apiConfig.flightBaseUrl;
    metaForm.aiModel.value = planner.apiConfig.aiModel;
  }

  function setupAdminMenu() {
    document.querySelectorAll("[data-admin-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.adminTarget;
        document.querySelectorAll("[data-admin-target]").forEach((item) => item.classList.toggle("active", item === button));
        document
          .querySelectorAll("[data-admin-panel]")
          .forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === target));
      });
    });
  }

  async function loadApiSettings() {
    try {
      const response = await fetch("/api/settings");
      const json = await response.json();
      apiSettingsForm.openaiApiKey.placeholder = json.gemini.apiKey || "尚未設定";
      apiSettingsForm.openaiModel.value = json.gemini.model || "gemini-2.5-flash";
      apiSettingsForm.gcpProjectId.value = json.gcp.projectId || "";
      apiSettingsForm.gcpLocation.value = json.gcp.location || "us-central1";
      apiSettingsForm.naverClientId.placeholder = json.naver.clientId || "尚未設定";
      apiSettingsForm.naverClientSecret.placeholder = json.naver.clientSecret || "尚未設定";
      apiSettingsForm.amadeusClientId.placeholder = json.amadeus.clientId || "尚未設定";
      apiSettingsForm.amadeusClientSecret.placeholder = json.amadeus.clientSecret || "尚未設定";
      apiSettingsForm.amadeusBaseUrl.value = json.amadeus.baseUrl || "https://test.api.amadeus.com";
    } catch {
      apiSettingsStatus.innerHTML = `<div class="empty-state">目前還無法讀取 API 設定，請先確認 server 已啟動。</div>`;
    }
  }

  function renderDayTabs() {
    const { planner } = getStore();
    dayTabsRoot.innerHTML = `
      <div class="tab-bar">
        ${planner.days
          .map(
            (day) => `
            <button type="button" class="tab-button ${day.id === activeDayId ? "active" : ""}" data-day-tab="${day.id}">
              ${day.label}
            </button>
          `
          )
          .join("")}
      </div>
    `;

    itemDaySelect.innerHTML = planner.days
      .map((day) => `<option value="${day.id}" ${day.id === activeDayId ? "selected" : ""}>${day.label}</option>`)
      .join("");

    dayTabsRoot.querySelectorAll("[data-day-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeDayId = button.dataset.dayTab;
        renderDayTabs();
        renderPlannerEditor();
      });
    });
  }

  function blockBadge(type) {
    if (type === "flight") return "航班";
    if (type === "transport") return "交通";
    return "景點";
  }

  function renderBlockEditor(block, day, planner, index) {
    return `
      <article class="planner-block planner-${block.type}" draggable="true" data-block-id="${block.id}" data-day-id="${day.id}">
        <div class="planner-block-head">
          <div class="time-badge">${block.startTime} - ${block.endTime}</div>
          <div class="chip-row">
            <span class="chip">${blockBadge(block.type)}</span>
            <span class="chip">${index + 1}</span>
          </div>
          <div class="block-actions">
            <button type="button" class="ghost small-button" data-move="up" data-block-id="${block.id}">上移</button>
            <button type="button" class="ghost small-button" data-move="down" data-block-id="${block.id}">下移</button>
            <button type="button" class="ghost small-button" data-delete-id="${block.id}">刪除</button>
          </div>
        </div>
        <div class="grid two">
          <label>
            區塊類型
            <select data-field="type" data-block-id="${block.id}">
              <option value="activity" ${block.type === "activity" ? "selected" : ""}>景點</option>
              <option value="transport" ${block.type === "transport" ? "selected" : ""}>交通</option>
              <option value="flight" ${block.type === "flight" ? "selected" : ""}>航班</option>
            </select>
          </label>
          <label>
            移動到日期
            <select data-move-day-select="${block.id}">
              ${planner.days
                .map((itemDay) => `<option value="${itemDay.id}" ${itemDay.id === day.id ? "selected" : ""}>${itemDay.label}</option>`)
                .join("")}
            </select>
          </label>
        </div>
        <div class="grid two">
          <label>
            開始時間
            <input type="time" data-field="startTime" data-block-id="${block.id}" value="${block.startTime}" />
          </label>
          <label>
            結束時間
            <input type="time" data-field="endTime" data-block-id="${block.id}" value="${block.endTime}" />
          </label>
        </div>
        <label>
          區塊標題
          <input data-field="title" data-block-id="${block.id}" value="${escapeHtml(block.title)}" />
        </label>
        ${renderTypeFields(block)}
        <div class="actions">
          <button type="button" class="secondary" data-move-day-button="${block.id}">移動到所選日期</button>
        </div>
      </article>
    `;
  }

  function renderTypeFields(block) {
    if (block.type === "transport") {
      return `
        <div class="grid two">
          <label>
            起點
            <input data-field="from" data-block-id="${block.id}" value="${escapeHtml(block.from || "")}" />
          </label>
          <label>
            終點
            <input data-field="to" data-block-id="${block.id}" value="${escapeHtml(block.to || "")}" />
          </label>
        </div>
        <div class="grid two">
          <label>
            交通方式
            <input data-field="transportMode" data-block-id="${block.id}" value="${escapeHtml(block.transportMode || "")}" />
          </label>
          <label>
            交通時間(分鐘)
            <input type="number" data-field="durationMinutes" data-block-id="${block.id}" value="${block.durationMinutes || 0}" />
          </label>
        </div>
        <label>
          交通說明
          <textarea rows="3" data-field="notes" data-block-id="${block.id}">${escapeHtml(block.notes || "")}</textarea>
        </label>
        <label>
          提醒
          <textarea rows="2" data-field="caution" data-block-id="${block.id}">${escapeHtml(block.caution || "")}</textarea>
        </label>
      `;
    }

    if (block.type === "flight") {
      return `
        <div class="grid two">
          <label>
            旅客
            <input data-field="travelerName" data-block-id="${block.id}" value="${escapeHtml(block.travelerName || "")}" />
          </label>
          <label>
            班號
            <input data-field="flightNumber" data-block-id="${block.id}" value="${escapeHtml(block.flightNumber || "")}" />
          </label>
        </div>
        <div class="grid two">
          <label>
            航線
            <input data-field="route" data-block-id="${block.id}" value="${escapeHtml(block.route || "")}" />
          </label>
          <label>
            機場 / 航廈
            <input data-field="terminal" data-block-id="${block.id}" value="${escapeHtml(block.terminal || "")}" />
          </label>
        </div>
        <label>
          航班備註
          <textarea rows="3" data-field="notes" data-block-id="${block.id}">${escapeHtml(block.notes || "")}</textarea>
        </label>
        <label>
          提醒
          <textarea rows="2" data-field="caution" data-block-id="${block.id}">${escapeHtml(block.caution || "")}</textarea>
        </label>
      `;
    }

    return `
      <label>
        景點
        <input data-field="place" data-block-id="${block.id}" value="${escapeHtml(block.place || "")}" />
      </label>
      <label>
        景點備註
        <textarea rows="3" data-field="notes" data-block-id="${block.id}">${escapeHtml(block.notes || "")}</textarea>
      </label>
      <div class="meta-grid">
        <span class="chip">營業：${block.businessHours || "待補"}</span>
        <span class="chip">交通：${block.travelMinutes || 0} 分鐘</span>
        <span class="chip">${block.area || "Busan"}</span>
      </div>
      <p class="small"><strong>建議移動：</strong>${block.transit || "待補"}</p>
      <p class="small"><strong>注意事項：</strong>${block.caution || "待補"}</p>
      <p class="small"><a class="link" href="${block.mapUrl || "#"}" target="_blank" rel="noreferrer">查看地圖連結</a></p>
    `;
  }

  function renderPlannerEditor() {
    const { planner } = getStore();
    const activeDay = planner.days.find((day) => day.id === activeDayId) || planner.days[0];
    if (!activeDay) {
      plannerEditorRoot.innerHTML = `<div class="empty-state">沒有可編輯的行程天數。</div>`;
      return;
    }

    plannerEditorRoot.innerHTML = `
      <div class="stack">
        <div class="info-card">
          <h3>${activeDay.label}</h3>
          <p class="meta">每個時間區塊都可切成景點、交通或航班。你可以把朋友第二天加入的航班放進時間軸，也能在景點中間插入獨立交通區塊。</p>
        </div>
        <div class="drop-zone" data-drop-day="${activeDay.id}">
          ${
            activeDay.blocks.length
              ? activeDay.blocks.map((block, index) => renderBlockEditor(block, activeDay, planner, index)).join("")
              : `<div class="empty-state">這一天還沒有區塊，先從右邊新增一個行程。</div>`
          }
        </div>
      </div>
    `;

    bindPlannerEditorEvents(activeDay.id);
  }

  function bindPlannerEditorEvents(dayId) {
    plannerEditorRoot.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const value = input.type === "number" ? Number(input.value || 0) : input.value;
        updatePlannerBlock(dayId, input.dataset.blockId, { [input.dataset.field]: value });
        renderPlannerEditor();
        renderAiChecks();
      });
    });

    plannerEditorRoot.querySelectorAll("[data-move]").forEach((button) => {
      button.addEventListener("click", () => {
        movePlannerBlock(dayId, button.dataset.blockId, button.dataset.move);
        renderPlannerEditor();
        renderAiChecks();
      });
    });

    plannerEditorRoot.querySelectorAll("[data-delete-id]").forEach((button) => {
      button.addEventListener("click", () => {
        deletePlannerBlock(dayId, button.dataset.deleteId);
        renderPlannerEditor();
        renderAiChecks();
      });
    });

    plannerEditorRoot.querySelectorAll("[data-move-day-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const blockId = button.dataset.moveDayButton;
        const select = plannerEditorRoot.querySelector(`[data-move-day-select="${blockId}"]`);
        if (!select || select.value === dayId) return;
        moveBlockAcrossDays(dayId, blockId, select.value);
        activeDayId = select.value;
        renderDayTabs();
        renderPlannerEditor();
        renderAiChecks();
      });
    });

    plannerEditorRoot.querySelectorAll(".planner-block").forEach((block) => {
      block.addEventListener("dragstart", () => {
        draggingBlock = { blockId: block.dataset.blockId, dayId: block.dataset.dayId };
      });
      block.addEventListener("dragend", () => {
        draggingBlock = null;
      });
    });

    plannerEditorRoot.querySelectorAll(".drop-zone").forEach((zone) => {
      zone.addEventListener("dragover", (event) => event.preventDefault());
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!draggingBlock || draggingBlock.dayId === zone.dataset.dropDay) return;
        moveBlockAcrossDays(draggingBlock.dayId, draggingBlock.blockId, zone.dataset.dropDay);
        activeDayId = zone.dataset.dropDay;
        renderDayTabs();
        renderPlannerEditor();
        renderAiChecks();
      });
    });
  }

  async function renderAiChecks() {
    const { planner } = getStore();
    let findings = analyzePlanner(planner);
    try {
      const response = await fetch("/api/ai/itinerary-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planner })
      });
      const json = await response.json();
      if (Array.isArray(json.findings) && json.findings.length) {
        findings = json.findings;
      }
    } catch {
      // Keep local fallback if backend or keys are unavailable.
    }
    aiCheckRoot.innerHTML = findings
      .map(
        (item) => `
        <article class="ai-card ${item.level}">
          <div class="row-between">
            <strong>${item.title}</strong>
            <span class="status ${mapLevelToStatus(item.level)}">${item.level}</span>
          </div>
          <p class="small">${item.message}</p>
        </article>
      `
      )
      .join("");
  }

  function renderFeedbackReview() {
    const { feedbackSubmissions } = getStore();
    feedbackReviewRoot.innerHTML = feedbackSubmissions.length
      ? feedbackSubmissions
          .map(
            (item) => `
            <article class="submission-card">
              <div class="row-between">
                <strong>${escapeHtml(item.requesterName)}</strong>
                <span class="status ${item.status}">${item.status}</span>
              </div>
              <p class="small"><strong>日期：</strong>${item.targetDay || "整體行程"}</p>
              <p class="small"><strong>想改的點：</strong>${escapeHtml(item.requestedPlaces).replace(/\n/g, "、")}</p>
              <p class="small"><strong>需求內容：</strong>${escapeHtml(item.requestMessage)}</p>
              <p class="small"><strong>限制：</strong>${escapeHtml(item.constraints || "無")}</p>
              <div class="actions">
                <button type="button" class="secondary" data-feedback-action="approved" data-feedback-id="${item.id}">標記採納</button>
                <button type="button" class="ghost" data-feedback-action="rejected" data-feedback-id="${item.id}">標記退回</button>
              </div>
            </article>
          `
          )
          .join("")
      : `<div class="empty-state">目前沒有待審核的朋友回饋。</div>`;

    feedbackReviewRoot.querySelectorAll("[data-feedback-action]").forEach((button) => {
      button.addEventListener("click", () => {
        updateFeedbackStatus(button.dataset.feedbackId, button.dataset.feedbackAction);
        renderFeedbackReview();
      });
    });
  }

  function renderGuideEditor() {
    const { guides } = getStore();
    guideEditorRoot.innerHTML = `
      <article class="info-card">
        <p class="small muted">這裡可以直接管理前台菜單下的住宿、票券、通訊 / 交通與地圖嵌入碼。所有變更都會立刻反映到前台。</p>
      </article>

      <section class="guide-admin-section">
        <div class="row-between">
          <h3>住宿區域</h3>
          <button type="button" class="primary" id="add-hotel-section">新增住宿區域</button>
        </div>
        ${guides.hotels
          .map(
            (section) => `
            <article class="submission-card">
              <div class="row-between">
                <strong>${section.area}</strong>
                <div class="actions">
                  <button type="button" class="ghost small-button" data-move-section="up" data-section-type="hotels" data-section-id="${section.id}">上移</button>
                  <button type="button" class="ghost small-button" data-move-section="down" data-section-type="hotels" data-section-id="${section.id}">下移</button>
                  <button type="button" class="ghost small-button" data-delete-section="hotels" data-section-id="${section.id}">刪除區域</button>
                </div>
              </div>
              <div class="grid two">
                <label>區域名稱<input data-edit-section="hotels" data-section-id="${section.id}" data-field="area" value="${escapeHtml(section.area)}" /></label>
                <label>區域說明<input data-edit-section="hotels" data-section-id="${section.id}" data-field="intro" value="${escapeHtml(section.intro)}" /></label>
              </div>
              <div class="stack">
                ${section.hotels
                  .map(
                    (hotel) => `
                    <article class="hotel-card">
                      <div class="actions">
                        <span class="chip">${section.area}</span>
                        <div class="actions">
                          <button type="button" class="ghost small-button" data-move-item="up" data-item-type="hotels" data-parent-id="${section.id}" data-item-id="${hotel.id}">上移</button>
                          <button type="button" class="ghost small-button" data-move-item="down" data-item-type="hotels" data-parent-id="${section.id}" data-item-id="${hotel.id}">下移</button>
                          <button type="button" class="ghost small-button" data-delete-item="hotels" data-parent-id="${section.id}" data-item-id="${hotel.id}">刪除</button>
                        </div>
                      </div>
                      <div class="grid two">
                        <label>飯店名稱<input data-edit-item="hotels" data-parent-id="${section.id}" data-item-id="${hotel.id}" data-field="name" value="${escapeHtml(hotel.name)}" /></label>
                        <label>星級<input data-edit-item="hotels" data-parent-id="${section.id}" data-item-id="${hotel.id}" data-field="stars" value="${escapeHtml(hotel.stars)}" /></label>
                      </div>
                      <label>摘要<textarea rows="2" data-edit-item="hotels" data-parent-id="${section.id}" data-item-id="${hotel.id}" data-field="summary">${escapeHtml(hotel.summary)}</textarea></label>
                    </article>
                  `
                  )
                  .join("")}
                <button type="button" class="secondary" data-add-item="hotels" data-parent-id="${section.id}">新增飯店</button>
              </div>
            </article>
          `
          )
          .join("")}
      </section>

      <section class="guide-admin-section">
        <div class="row-between">
          <h3>票券整理</h3>
          <button type="button" class="primary" id="add-ticket-item">新增票券</button>
        </div>
        ${guides.tickets
          .map(
            (ticket) => `
            <article class="hotel-card">
              <div class="actions">
                <span class="chip">票券</span>
                <div class="actions">
                  <button type="button" class="ghost small-button" data-move-item="up" data-item-type="tickets" data-item-id="${ticket.id}">上移</button>
                  <button type="button" class="ghost small-button" data-move-item="down" data-item-type="tickets" data-item-id="${ticket.id}">下移</button>
                  <button type="button" class="ghost small-button" data-delete-item="tickets" data-item-id="${ticket.id}">刪除</button>
                </div>
              </div>
              <div class="grid two">
                <label>票券名稱<input data-edit-item="tickets" data-item-id="${ticket.id}" data-field="name" value="${escapeHtml(ticket.name)}" /></label>
                <label>Pass 標記<input data-edit-item="tickets" data-item-id="${ticket.id}" data-field="pass" value="${escapeHtml(ticket.pass)}" /></label>
              </div>
              <label>摘要<textarea rows="2" data-edit-item="tickets" data-item-id="${ticket.id}" data-field="summary">${escapeHtml(ticket.summary)}</textarea></label>
            </article>
          `
          )
          .join("")}
      </section>

      <section class="guide-admin-section">
        <div class="row-between">
          <h3>通訊 / 交通</h3>
          <button type="button" class="primary" id="add-connectivity-section">新增分類</button>
        </div>
        ${guides.connectivity
          .map(
            (section) => `
            <article class="submission-card">
              <div class="row-between">
                <strong>${section.category}</strong>
                <div class="actions">
                  <button type="button" class="ghost small-button" data-move-section="up" data-section-type="connectivity" data-section-id="${section.id}">上移</button>
                  <button type="button" class="ghost small-button" data-move-section="down" data-section-type="connectivity" data-section-id="${section.id}">下移</button>
                  <button type="button" class="ghost small-button" data-delete-section="connectivity" data-section-id="${section.id}">刪除分類</button>
                </div>
              </div>
              <label>分類名稱<input data-edit-section="connectivity" data-section-id="${section.id}" data-field="category" value="${escapeHtml(section.category)}" /></label>
              <div class="stack">
                ${section.items
                  .map(
                    (item) => `
                    <article class="hotel-card">
                      <div class="actions">
                        <span class="chip">${section.category}</span>
                        <div class="actions">
                          <button type="button" class="ghost small-button" data-move-item="up" data-item-type="connectivity" data-parent-id="${section.id}" data-item-id="${item.id}">上移</button>
                          <button type="button" class="ghost small-button" data-move-item="down" data-item-type="connectivity" data-parent-id="${section.id}" data-item-id="${item.id}">下移</button>
                          <button type="button" class="ghost small-button" data-delete-item="connectivity" data-parent-id="${section.id}" data-item-id="${item.id}">刪除</button>
                        </div>
                      </div>
                      <label>項目名稱<input data-edit-item="connectivity" data-parent-id="${section.id}" data-item-id="${item.id}" data-field="name" value="${escapeHtml(item.name)}" /></label>
                      <label>摘要<textarea rows="2" data-edit-item="connectivity" data-parent-id="${section.id}" data-item-id="${item.id}" data-field="summary">${escapeHtml(item.summary)}</textarea></label>
                    </article>
                  `
                  )
                  .join("")}
                <button type="button" class="secondary" data-add-item="connectivity" data-parent-id="${section.id}">新增項目</button>
              </div>
            </article>
          `
          )
          .join("")}
      </section>

      <section class="guide-admin-section">
        <h3>釜山地圖嵌入碼</h3>
        <label>Google My Maps iframe<textarea id="map-embed-editor" rows="6">${escapeHtml(guides.mapEmbed)}</textarea></label>
        <div class="actions">
          <button type="button" class="primary" id="save-map-embed">儲存地圖嵌入碼</button>
        </div>
      </section>
    `;

    bindGuideEditorEvents();
  }

  function bindGuideEditorEvents() {
    guideEditorRoot.querySelectorAll("[data-edit-section]").forEach((input) => {
      input.addEventListener("change", () => {
        updateGuideSection(input.dataset.editSection, input.dataset.sectionId, { [input.dataset.field]: input.value });
        renderGuideEditor();
      });
    });

    guideEditorRoot.querySelectorAll("[data-edit-item]").forEach((input) => {
      input.addEventListener("change", () => {
        updateGuideItem(
          input.dataset.editItem,
          input.dataset.itemId,
          { [input.dataset.field]: input.value },
          input.dataset.parentId
        );
        renderGuideEditor();
      });
    });

    guideEditorRoot.querySelectorAll("[data-delete-section]").forEach((button) => {
      button.addEventListener("click", () => {
        deleteGuideSection(button.dataset.deleteSection, button.dataset.sectionId);
        renderGuideEditor();
      });
    });

    guideEditorRoot.querySelectorAll("[data-move-section]").forEach((button) => {
      button.addEventListener("click", () => {
        moveGuideSection(button.dataset.sectionType, button.dataset.sectionId, button.dataset.moveSection);
        renderGuideEditor();
      });
    });

    guideEditorRoot.querySelectorAll("[data-add-item]").forEach((button) => {
      button.addEventListener("click", () => {
        addGuideItem(button.dataset.addItem, button.dataset.parentId, {});
        renderGuideEditor();
      });
    });

    guideEditorRoot.querySelectorAll("[data-delete-item]").forEach((button) => {
      button.addEventListener("click", () => {
        deleteGuideItem(button.dataset.deleteItem, button.dataset.itemId, button.dataset.parentId);
        renderGuideEditor();
      });
    });

    guideEditorRoot.querySelectorAll("[data-move-item]").forEach((button) => {
      button.addEventListener("click", () => {
        moveGuideItem(button.dataset.itemType, button.dataset.itemId, button.dataset.moveItem, button.dataset.parentId);
        renderGuideEditor();
      });
    });

    const addHotelSection = document.getElementById("add-hotel-section");
    if (addHotelSection) {
      addHotelSection.addEventListener("click", () => {
        addGuideSection("hotels", {});
        renderGuideEditor();
      });
    }

    const addTicketItem = document.getElementById("add-ticket-item");
    if (addTicketItem) {
      addTicketItem.addEventListener("click", () => {
        addGuideItem("tickets", "", {});
        renderGuideEditor();
      });
    }

    const addConnectivitySection = document.getElementById("add-connectivity-section");
    if (addConnectivitySection) {
      addConnectivitySection.addEventListener("click", () => {
        addGuideSection("connectivity", {});
        renderGuideEditor();
      });
    }

    const saveMapEmbed = document.getElementById("save-map-embed");
    if (saveMapEmbed) {
      saveMapEmbed.addEventListener("click", () => {
        updateMapEmbed(document.getElementById("map-embed-editor").value);
        renderGuideEditor();
      });
    }
  }

  async function saveApiSettings(event) {
    event.preventDefault();
    const formData = new FormData(apiSettingsForm);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    apiSettingsStatus.innerHTML = `<article class="info-card"><strong>已儲存 API 設定</strong><p class="small">Gemini：${json.settings.gemini.apiKey || "未設"} | GCP Project：${json.settings.gcp.projectId || "未設"} | NAVER：${json.settings.naver.clientId || "未設"} | Amadeus：${json.settings.amadeus.clientId || "未設"}</p></article>`;
    apiSettingsForm.reset();
    loadApiSettings();
  }

  async function testProviderConnection(provider) {
    apiSettingsStatus.innerHTML = `<article class="info-card"><p class="small">正在測試 ${provider} 連線...</p></article>`;
    const response = await fetch("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider })
    });
    const json = await response.json();
    apiSettingsStatus.innerHTML = `
      <article class="ai-card ${json.ok ? "ok" : "error"}">
        <div class="row-between">
          <strong>${provider} 連線測試</strong>
          <span class="status ${json.ok ? "approved" : "rejected"}">${json.ok ? "成功" : "失敗"}</span>
        </div>
        <p class="small">${json.message}${json.status ? ` (HTTP ${json.status})` : ""}</p>
      </article>
    `;
  }

  metaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    savePlannerMeta({
      title: metaForm.title.value,
      city: metaForm.city.value,
      startDate: metaForm.startDate.value,
      endDate: metaForm.endDate.value,
      outboundFlight: metaForm.outboundFlight.value,
      inboundFlight: metaForm.inboundFlight.value,
      friendJoinFlight: metaForm.friendJoinFlight.value,
      generalNotes: metaForm.generalNotes.value,
      geminiBaseUrl: metaForm.geminiBaseUrl.value,
      naverMapBaseUrl: metaForm.naverMapBaseUrl.value,
      flightBaseUrl: metaForm.flightBaseUrl.value,
      aiModel: metaForm.aiModel.value
    });
    renderMetaForm();
    renderDayTabs();
    renderPlannerEditor();
    renderAiChecks();
    alert("總設定與 API 設定已儲存。");
  });

  itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addPlannerBlock(itemForm.dayId.value, {
      type: itemForm.blockType.value,
      place: itemForm.place.value,
      title: itemForm.title.value,
      startTime: itemForm.startTime.value,
      endTime: itemForm.endTime.value,
      notes: itemForm.notes.value,
      transportMode: itemForm.transportMode.value,
      from: itemForm.from.value,
      to: itemForm.to.value,
      durationMinutes: Number(itemForm.durationMinutes.value || 0),
      travelerName: itemForm.travelerName.value,
      flightNumber: itemForm.flightNumber.value,
      route: itemForm.route.value,
      terminal: itemForm.terminal.value
    });
    activeDayId = itemForm.dayId.value;
    itemForm.reset();
    renderDayTabs();
    renderPlannerEditor();
    renderAiChecks();
  });

  document.getElementById("run-ai-check").addEventListener("click", () => {
    renderAiChecks();
  });

  apiSettingsForm.addEventListener("submit", saveApiSettings);

  document.querySelectorAll("[data-test-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      testProviderConnection(button.dataset.testProvider);
    });
  });

  document.getElementById("add-item-button").addEventListener("click", () => {
    itemDaySelect.value = activeDayId;
    itemForm.blockType.focus();
  });

  const logoutButton = document.getElementById("admin-logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch("/api/admin/logout", { method: "POST" });
      } finally {
        window.location.href = "/login.html";
      }
    });
  }

  setupAdminMenu();
  renderMetaForm();
  renderDayTabs();
  renderPlannerEditor();
  renderAiChecks();
  renderGuideEditor();
  renderFeedbackReview();
  loadApiSettings();loadApiSettings();
  
  // ↓↓↓ 在這裡加入新代碼 ↓↓↓
  async function loadFeedbackFromServer() {
    try {
      const response = await fetch("/api/feedback");
      if (response.ok) {
        const data = await response.json();
        const store = getStore();
        store.feedbackSubmissions = data.feedbackSubmissions || [];
        renderFeedbackReview();
      }
    } catch (error) {
      console.error("載入反饋失敗：", error);
    }
  }

  loadFeedbackFromServer();
  // ↑↑↑ 加到這裡 ↑↑↑
})();
})();

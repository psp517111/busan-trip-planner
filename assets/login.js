(function () {
  const form = document.getElementById("login-form");
  const status = document.getElementById("login-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const password = formData.get("password");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      window.location.href = "/admin.html";
      return;
    }

    status.innerHTML = `<div class="ai-card error"><p class="small">密碼錯誤，請再試一次。</p></div>`;
  });
})();

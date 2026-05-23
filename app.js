const adminKey = "course-stat-system:admin-token";
const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:3000" : "";

let courses = [];

const els = {
  roleButtons: document.querySelectorAll(".role-btn"),
  views: document.querySelectorAll(".view"),
  totalCourses: document.querySelector("#totalCourses"),
  totalEnrolled: document.querySelector("#totalEnrolled"),
  totalSeats: document.querySelector("#totalSeats"),
  liveStatus: document.querySelector("#liveStatus"),
  courseList: document.querySelector("#courseList"),
  adminCourseList: document.querySelector("#adminCourseList"),
  studentCount: document.querySelector("#studentCount"),
  keywordInput: document.querySelector("#keywordInput"),
  dateInput: document.querySelector("#dateInput"),
  categoryInput: document.querySelector("#categoryInput"),
  resetFilters: document.querySelector("#resetFilters"),
  loginPanel: document.querySelector("#loginPanel"),
  adminPanel: document.querySelector("#adminPanel"),
  loginForm: document.querySelector("#loginForm"),
  adminUser: document.querySelector("#adminUser"),
  adminPass: document.querySelector("#adminPass"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  courseForm: document.querySelector("#courseForm"),
  formTitle: document.querySelector("#formTitle"),
  clearFormBtn: document.querySelector("#clearFormBtn"),
  importInput: document.querySelector("#importInput"),
  exportBtn: document.querySelector("#exportBtn"),
  courseTemplate: document.querySelector("#courseTemplate")
};

const formFields = {
  id: document.querySelector("#courseId"),
  title: document.querySelector("#titleInput"),
  category: document.querySelector("#adminCategoryInput"),
  time: document.querySelector("#timeInput"),
  location: document.querySelector("#locationInput"),
  teacher: document.querySelector("#teacherInput"),
  capacity: document.querySelector("#capacityInput"),
  enrolled: document.querySelector("#enrolledInput"),
  description: document.querySelector("#descriptionInput")
};

const visualMap = {
  "设计": "linear-gradient(135deg, #24735b, #86a859)",
  "编程": "linear-gradient(135deg, #2d5f8f, #56a0a4)",
  "商业": "linear-gradient(135deg, #b7811f, #d38f6a)",
  "语言": "linear-gradient(135deg, #c95f48, #806bb2)"
};

function getToken() {
  return sessionStorage.getItem(adminKey);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || "请求失败");
  }
  return data;
}

function announce(message) {
  els.liveStatus.textContent = message;
  window.clearTimeout(announce.timer);
  announce.timer = window.setTimeout(() => {
    els.liveStatus.textContent = "数据已同步";
  }, 1800);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short"
  }).format(new Date(value));
}

function remaining(course) {
  return Math.max(0, Number(course.capacity) - Number(course.enrolled));
}

function getFilteredCourses() {
  const keyword = els.keywordInput.value.trim().toLowerCase();
  const date = els.dateInput.value;
  const category = els.categoryInput.value;

  return courses.filter((course) => {
    const searchable = [course.title, course.description, course.teacher, course.location, course.category]
      .join(" ")
      .toLowerCase();
    const sameDate = !date || course.time.slice(0, 10) === date;
    const sameCategory = !category || course.category === category;
    return searchable.includes(keyword) && sameDate && sameCategory;
  });
}

function renderStats() {
  const totalEnrolled = courses.reduce((sum, course) => sum + Number(course.enrolled), 0);
  const totalSeats = courses.reduce((sum, course) => sum + remaining(course), 0);
  els.totalCourses.textContent = courses.length;
  els.totalEnrolled.textContent = totalEnrolled;
  els.totalSeats.textContent = totalSeats;
}

function renderStudentCourses() {
  const filtered = getFilteredCourses();
  els.studentCount.textContent = `${filtered.length} 门课程可选`;
  els.courseList.innerHTML = "";

  if (!filtered.length) {
    els.courseList.innerHTML = '<div class="empty">没有找到符合条件的课程</div>';
    return;
  }

  filtered.forEach((course) => {
    const node = els.courseTemplate.content.firstElementChild.cloneNode(true);
    node.style.setProperty("--visual", visualMap[course.category] || visualMap["设计"]);
    node.querySelector(".tag").textContent = course.category;
    node.querySelector(".seats").textContent = remaining(course) === 0 ? "名额已满" : "";
    node.querySelector("h3").textContent = course.title;
    node.querySelector(".description").textContent = course.description;
    node.querySelector(".date").textContent = formatDate(course.time);
    node.querySelector(".location").textContent = course.location;
    node.querySelector(".teacher").textContent = course.teacher;

    const signupBtn = node.querySelector(".signup-btn");
    if (remaining(course) === 0) {
      signupBtn.textContent = "名额已满";
      signupBtn.disabled = true;
    }
    signupBtn.addEventListener("click", () => signUp(course.id));
    els.courseList.appendChild(node);
  });
}

function renderAdminCourses() {
  els.adminCourseList.innerHTML = "";
  if (!courses.length) {
    els.adminCourseList.innerHTML = '<div class="empty">暂无课程，请新增或上传课程数据</div>';
    return;
  }

  courses
    .slice()
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .forEach((course) => {
      const row = document.createElement("article");
      row.className = "admin-row";

      const summary = document.createElement("div");
      const title = document.createElement("strong");
      const meta = document.createElement("p");
      title.textContent = course.title;
      meta.textContent = `${formatDate(course.time)} · ${course.category} · ${course.enrolled}/${course.capacity} 人`;
      summary.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "row-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.dataset.id = course.id;
      editButton.textContent = "编辑";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = course.id;
      deleteButton.textContent = "删除";
      actions.append(editButton, deleteButton);

      row.append(summary, actions);
      els.adminCourseList.appendChild(row);
    });
}

function render() {
  renderStats();
  renderStudentCourses();
  renderAdminCourses();
}

async function loadCourses(message = "数据已同步") {
  try {
    const data = await api("/api/courses");
    courses = data.courses;
    render();
    announce(message);
  } catch {
    els.courseList.innerHTML = '<div class="empty">无法连接课程服务器，请通过服务器网址打开页面</div>';
    announce("服务器未连接");
  }
}

function connectRealtime() {
  try {
    const events = new EventSource(`${apiBase}/api/events`);
    events.addEventListener("courses", (event) => {
      courses = JSON.parse(event.data);
      render();
      announce("数据已实时更新");
    });
    events.addEventListener("error", () => {
      announce("实时连接重试中");
    });
  } catch {
    announce("实时连接不可用");
  }
}

async function signUp(id) {
  try {
    const data = await api(`/api/courses/${encodeURIComponent(id)}/signup`, { method: "POST" });
    courses = data.courses;
    render();
    announce("报名成功");
  } catch (error) {
    announce(error.message);
  }
}

function resetForm() {
  els.courseForm.reset();
  formFields.id.value = "";
  formFields.category.value = "设计";
  els.formTitle.textContent = "新增课程";
}

function fillForm(course) {
  formFields.id.value = course.id;
  formFields.title.value = course.title;
  formFields.category.value = course.category;
  formFields.time.value = course.time;
  formFields.location.value = course.location;
  formFields.teacher.value = course.teacher;
  formFields.capacity.value = course.capacity;
  formFields.enrolled.value = course.enrolled;
  formFields.description.value = course.description;
  els.formTitle.textContent = "编辑课程";
  window.scrollTo({ top: els.adminPanel.offsetTop, behavior: "smooth" });
}

function readForm() {
  const capacity = Number(formFields.capacity.value);
  const enrolled = Math.max(0, Math.min(Number(formFields.enrolled.value), capacity));
  return {
    id: formFields.id.value || `c-${Date.now()}`,
    title: formFields.title.value.trim(),
    category: formFields.category.value,
    time: formFields.time.value,
    location: formFields.location.value.trim(),
    teacher: formFields.teacher.value.trim(),
    capacity,
    enrolled,
    description: formFields.description.value.trim()
  };
}

async function handleCourseSubmit(event) {
  event.preventDefault();
  const course = readForm();
  const isEditing = Boolean(formFields.id.value);
  const method = isEditing ? "PUT" : "POST";
  const path = isEditing ? `/api/admin/courses/${encodeURIComponent(course.id)}` : "/api/admin/courses";
  try {
    const data = await api(path, { method, body: JSON.stringify(course) });
    courses = data.courses;
    render();
    resetForm();
    announce(isEditing ? "课程已更新" : "课程已新增");
  } catch (error) {
    announce(error.message);
  }
}

function importCourses(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const nextCourses = JSON.parse(reader.result);
      if (!Array.isArray(nextCourses)) throw new Error("invalid");
      const data = await api("/api/admin/import", {
        method: "POST",
        body: JSON.stringify({ courses: nextCourses })
      });
      courses = data.courses;
      render();
      announce("课程数据已上传");
    } catch {
      announce("上传失败，请检查 JSON 格式或登录状态");
    }
  };
  reader.readAsText(file);
}

function exportCourses() {
  const blob = new Blob([JSON.stringify(courses, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "courses.json";
  link.click();
  URL.revokeObjectURL(url);
}

els.roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    els.roleButtons.forEach((item) => item.classList.remove("active"));
    els.views.forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
    document.body.dataset.view = button.dataset.view;
  });
});

[els.keywordInput, els.dateInput, els.categoryInput].forEach((input) => {
  input.addEventListener("input", renderStudentCourses);
});

els.resetFilters.addEventListener("click", () => {
  els.keywordInput.value = "";
  els.dateInput.value = "";
  els.categoryInput.value = "";
  renderStudentCourses();
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: els.adminUser.value.trim(),
        password: els.adminPass.value
      })
    });
    sessionStorage.setItem(adminKey, data.token);
    els.loginPanel.classList.add("hidden");
    els.adminPanel.classList.remove("hidden");
    els.loginMessage.textContent = "";
    announce("管理员已登录");
  } catch {
    els.loginMessage.textContent = "账号或密码不正确";
  }
});

els.logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(adminKey);
  els.loginPanel.classList.remove("hidden");
  els.adminPanel.classList.add("hidden");
});

els.courseForm.addEventListener("submit", handleCourseSubmit);
els.clearFormBtn.addEventListener("click", resetForm);
els.exportBtn.addEventListener("click", exportCourses);

els.importInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importCourses(file);
  event.target.value = "";
});

els.adminCourseList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const course = courses.find((item) => item.id === button.dataset.id);
  if (!course) return;
  if (button.dataset.action === "edit") {
    fillForm(course);
  }
  if (button.dataset.action === "delete") {
    try {
      const data = await api(`/api/admin/courses/${encodeURIComponent(course.id)}`, { method: "DELETE" });
      courses = data.courses;
      render();
      resetForm();
      announce("课程已删除");
    } catch (error) {
      announce(error.message);
    }
  }
});

if (getToken()) {
  els.loginPanel.classList.add("hidden");
  els.adminPanel.classList.remove("hidden");
}

loadCourses();
connectRealtime();

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const rootDir = __dirname;
const dataDir = process.env.DATA_DIR || rootDir;
const dataFile = path.join(dataDir, "courses.json");
const port = Number(process.env.PORT || 3000);
const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const adminToken = crypto.randomBytes(32).toString("hex");
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function readCourses() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.copyFileSync(path.join(rootDir, "courses.json"), dataFile);
  }
}

function normalizeCourse(course) {
  const capacity = Math.max(1, Number(course.capacity) || 1);
  const enrolled = Math.max(0, Math.min(Number(course.enrolled) || 0, capacity));
  return {
    id: String(course.id || `c-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`),
    title: String(course.title || "未命名课程"),
    category: String(course.category || "设计"),
    time: String(course.time || new Date().toISOString().slice(0, 16)),
    location: String(course.location || "待定"),
    teacher: String(course.teacher || "待定"),
    capacity,
    enrolled,
    description: String(course.description || "课程信息待补充")
  };
}

function writeCourses(courses) {
  fs.writeFileSync(dataFile, `${JSON.stringify(courses.map(normalizeCourse), null, 2)}\n`);
  broadcastCourses();
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  send(res, status, { message });
}

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${adminToken}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("请求内容过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON 格式不正确"));
      }
    });
  });
}

function broadcastCourses() {
  const payload = `event: courses\ndata: ${JSON.stringify(readCourses())}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(rootDir, decodeURIComponent(requested)));

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/courses") {
    send(res, 200, { courses: readCourses() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    clients.add(res);
    res.write(`event: courses\ndata: ${JSON.stringify(readCourses())}\n\n`);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    if (body.username === adminUser && body.password === adminPassword) {
      send(res, 200, { token: adminToken });
    } else {
      sendError(res, 401, "账号或密码不正确");
    }
    return;
  }

  const signupMatch = url.pathname.match(/^\/api\/courses\/([^/]+)\/signup$/);
  if (req.method === "POST" && signupMatch) {
    const id = decodeURIComponent(signupMatch[1]);
    const courses = readCourses();
    const course = courses.find((item) => item.id === id);
    if (!course) {
      sendError(res, 404, "课程不存在");
      return;
    }
    if (course.enrolled >= course.capacity) {
      sendError(res, 409, "课程名额已满");
      return;
    }
    course.enrolled += 1;
    writeCourses(courses);
    send(res, 200, { courses: readCourses() });
    return;
  }

  if (url.pathname.startsWith("/api/admin/") && !isAdmin(req)) {
    sendError(res, 401, "请先登录管理员账号");
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/courses") {
    const body = await readBody(req);
    const courses = readCourses();
    courses.push(normalizeCourse(body));
    writeCourses(courses);
    send(res, 200, { courses: readCourses() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/import") {
    const body = await readBody(req);
    if (!Array.isArray(body.courses)) {
      sendError(res, 400, "课程数据必须是数组");
      return;
    }
    writeCourses(body.courses);
    send(res, 200, { courses: readCourses() });
    return;
  }

  const adminCourseMatch = url.pathname.match(/^\/api\/admin\/courses\/([^/]+)$/);
  if (adminCourseMatch) {
    const id = decodeURIComponent(adminCourseMatch[1]);
    const courses = readCourses();
    const index = courses.findIndex((item) => item.id === id);

    if (index < 0) {
      sendError(res, 404, "课程不存在");
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      courses[index] = normalizeCourse({ ...body, id });
      writeCourses(courses);
      send(res, 200, { courses: readCourses() });
      return;
    }

    if (req.method === "DELETE") {
      courses.splice(index, 1);
      writeCourses(courses);
      send(res, 200, { courses: readCourses() });
      return;
    }
  }

  sendError(res, 404, "接口不存在");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendError(res, 500, error.message || "服务器错误");
  }
});

server.listen(port, () => {
  ensureDataFile();
  console.log(`Course system is running at http://localhost:${port}`);
  console.log(`Admin account: ${adminUser} / ${adminPassword}`);
  console.log(`Course data file: ${dataFile}`);
});

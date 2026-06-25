const msalConfig = {
  auth: {
    clientId: "YOUR_MICROSOFT_APP_CLIENT_ID",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin + "/sub/dateien.html"
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

const loginRequest = {
  scopes: ["User.Read", "Files.ReadWrite.All"],
  loginHint: "aulatechnik@sgl.schule"
};

const graphFolderPath = "/AulaDateien";
const msalInstance = new msal.PublicClientApplication(msalConfig);

const authStatus = document.getElementById("authStatus");
const loginBtn = document.getElementById("loginBtn");
const uploadForm = document.getElementById("uploadForm");
const uploadInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const refreshBtn = document.getElementById("refreshBtn");
const statusMessage = document.getElementById("statusMessage");

function updateStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.style.color = isError ? "#c0392b" : "#1f3c88";
}

function updateAuthInfo(account) {
  if (account) {
    authStatus.textContent = `Angemeldet als ${account.username}`;
    authStatus.classList.add("logged-in");
    loginBtn.textContent = "Neu anmelden";
  } else {
    authStatus.textContent = "Nicht angemeldet. Bitte mit aulatechnik@sgl.schule anmelden.";
    authStatus.classList.remove("logged-in");
    loginBtn.textContent = "Mit Microsoft anmelden";
  }
}

async function signIn() {
  try {
    const loginResponse = await msalInstance.loginPopup(loginRequest);
    updateAuthInfo(loginResponse.account);
    updateStatus("Anmeldung erfolgreich. Lade Dateien...");
    await listFiles();
  } catch (error) {
    console.error(error);
    updateStatus("Anmeldung fehlgeschlagen. Bitte Seite neu laden und erneut versuchen.", true);
  }
}

function getAccount() {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

async function getAccessToken() {
  const account = getAccount();
  if (!account) {
    throw new Error("Kein angemeldetes Konto gefunden.");
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account
    });
    return response.accessToken;
  } catch (error) {
    const response = await msalInstance.acquireTokenPopup({
      ...loginRequest,
      account
    });
    return response.accessToken;
  }
}

async function ensureFolder() {
  const token = await getAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${graphFolderPath}` , {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.ok) {
    return;
  }

  const errorData = await response.json();
  if (errorData && errorData.error && errorData.error.code === "itemNotFound") {
    const createResponse = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: graphFolderPath.replace(/^\//, ""),
        folder: {},
        "@microsoft.graph.conflictBehavior": "replace"
      })
    });

    if (!createResponse.ok) {
      const createError = await createResponse.text();
      throw new Error(`Ordner konnte nicht erstellt werden: ${createError}`);
    }

    return;
  }

  throw new Error("Ordnerprüfung fehlgeschlagen: " + JSON.stringify(errorData));
}

async function uploadFile(file) {
  const token = await getAccessToken();
  await ensureFolder();

  const fileName = encodeURIComponent(file.name).replace(/%20/g, "+");
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${graphFolderPath}/${fileName}:/content`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: file
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Datei-Upload fehlgeschlagen: ${errorText}`);
  }

  return await response.json();
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString("de-DE");
  } catch {
    return value;
  }
}

async function listFiles() {
  fileList.innerHTML = "<p>Lade Dateien...</p>";
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${graphFolderPath}:/children?$select=id,name,webUrl,createdDateTime,size`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 404) {
      await ensureFolder();
      return listFiles();
    }

    if (!response.ok) {
      throw new Error(`Dateiliste konnte nicht geladen werden: ${response.statusText}`);
    }

    const data = await response.json();
    renderFileList(data.value || []);
    updateStatus("Dateiliste aktualisiert.");
  } catch (error) {
    console.error(error);
    fileList.innerHTML = "<p>Die Dateien konnten nicht geladen werden.</p>";
    updateStatus("Dateiliste konnte nicht geladen werden. Bitte erneut anmelden oder prüfen Sie die Berechtigungen.", true);
  }
}

function renderFileList(items) {
  if (!items || items.length === 0) {
    fileList.innerHTML = "<p>Keine Dateien vorhanden. Laden Sie bitte eine Datei hoch.</p>";
    return;
  }

  const sorted = items.slice().sort((a, b) => new Date(b.createdDateTime) - new Date(a.createdDateTime));
  fileList.innerHTML = "";

  for (const item of sorted) {
    fileList.appendChild(createFileCard(item));
  }
}

function createFileCard(item) {
  const card = document.createElement("div");
  card.className = "file-card";

  const info = document.createElement("div");
  info.className = "file-info";
  info.innerHTML = `<strong>${item.name}</strong><br><span>Erstellt: ${formatDateTime(item.createdDateTime)}</span><br><span>Größe: ${Math.round(item.size / 1024)} KB</span>`;

  const actions = document.createElement("div");
  actions.className = "file-actions";
  const openBtn = document.createElement("a");
  openBtn.href = item.webUrl;
  openBtn.target = "_blank";
  openBtn.rel = "noopener noreferrer";
  openBtn.textContent = "In OneDrive öffnen";
  openBtn.className = "button link-button";

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Herunterladen";
  downloadBtn.type = "button";
  downloadBtn.addEventListener("click", () => downloadFile(item.id, item.name));

  actions.appendChild(openBtn);
  actions.appendChild(downloadBtn);
  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

async function downloadFile(itemId, name) {
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Download fehlgeschlagen: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    updateStatus("Download fehlgeschlagen. Bitte prüfen Sie die Anmeldung und Berechtigungen.", true);
  }
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!uploadInput.files.length) {
    updateStatus("Bitte wählen Sie zuerst eine Datei aus.", true);
    return;
  }

  const file = uploadInput.files[0];
  updateStatus(`Datei ${file.name} wird hochgeladen...`);

  try {
    await uploadFile(file);
    updateStatus(`Datei ${file.name} erfolgreich hochgeladen.`);
    uploadForm.reset();
    await listFiles();
  } catch (error) {
    console.error(error);
    updateStatus("Upload fehlgeschlagen. Bitte erneut versuchen.", true);
  }
});

loginBtn.addEventListener("click", signIn);
refreshBtn.addEventListener("click", listFiles);

window.addEventListener("load", async () => {
  const account = getAccount();
  updateAuthInfo(account);
  if (account) {
    await listFiles();
  }
});

// Assume gapi and google objects are available globally from script tags injected by this service.
// These declarations prevent TypeScript errors.
declare const gapi: any;
declare const google: any;

// IMPORTANT: This GOOGLE_CLIENT_ID is for Google OAuth and must be configured in your environment.
const CLIENT_ID = '505639746721-slm4gqdhdvhtpe60glidl9a25n69nk6m.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const isGoogleAuthConfigured = !!CLIENT_ID;
// The API Key is not strictly required for Picker when using OAuth, so we only check for Client ID.
export const isGoogleDriveConfigured = !!CLIENT_ID;

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let scriptsLoaded = false;

export const initGoogleClient = (
  onGapiLoad: () => void,
  onGisLoad: () => void
) => {
  if (scriptsLoaded) {
    if (gapiInited) onGapiLoad();
    if (gisInited) onGisLoad();
    return;
  }
  scriptsLoaded = true;

  // Load GAPI client for Picker and Drive APIs
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true;
  gapiScript.defer = true;
  gapiScript.onload = () => {
    gapi.load('client:picker', () => {
      // GAPI client is ready for use but not yet authorized
      gapiInited = true;
      onGapiLoad();
    });
  };
  document.body.appendChild(gapiScript);

  // Load Google Identity Services (GIS) for OAuth
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.async = true;
  gisScript.defer = true;
  gisScript.onload = () => {
    if (CLIENT_ID) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // Callback is set dynamically at call time
        });
    }
    gisInited = true;
    onGisLoad();
  };
  document.body.appendChild(gisScript);
};

export const handleSignIn = (callback: (token: any) => void) => {
  if (!gisInited || !tokenClient) {
    console.error("Google Identity Services not initialized.");
    alert("Sign-in is not available. Please check the console for errors.");
    return;
  }
  tokenClient.callback = (tokenResponse: any) => {
    if (tokenResponse && tokenResponse.access_token) {
        gapi.client.setToken(tokenResponse);
        callback(tokenResponse);
    }
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({ prompt: '' });
  }
};

export const handleSignOut = (callback: () => void) => {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken(null);
      callback();
    });
  } else {
    callback();
  }
};

const createPicker = (view: any, callback: (data: any) => void) => {
  const token = gapi.client.getToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  // The project number from your Google Cloud Console project.
  const appId = CLIENT_ID?.split('-')[0];
  if (!appId) {
      throw new Error("Invalid or missing GOOGLE_CLIENT_ID format.");
  }

  const picker = new google.picker.PickerBuilder()
    .setAppId(appId)
    .setOAuthToken(token.access_token)
    .addView(view)
    .setCallback(callback)
    .build();
  picker.setVisible(true);
};

export const showFilePicker = (onFilePicked: (fileId: string) => void) => {
  const callback = (data: any) => {
    if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
      const doc = data[google.picker.Response.DOCUMENTS][0];
      onFilePicked(doc[google.picker.Document.ID]);
    }
  };
  const view = new google.picker.View(google.picker.ViewId.DOCS);
  view.setMimeTypes('application/json');
  createPicker(view, callback);
};

export const showFolderPicker = (onFolderPicked: (folderId: string) => void) => {
  const callback = (data: any) => {
    if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
      const doc = data[google.picker.Response.DOCUMENTS][0];
      onFolderPicked(doc[google.picker.Document.ID]);
    }
  };
  const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);
  createPicker(view, callback);
};

export const saveFileToDrive = async (
  fileName: string,
  folderId: string,
  content: string
): Promise<string> => {
  await gapi.client.load(DISCOVERY_DOC);
  const metadata = {
    name: fileName.endsWith('.json') ? fileName : `${fileName}.json`,
    mimeType: 'application/json',
    parents: [folderId],
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: new Headers({ 'Authorization': `Bearer ${gapi.client.getToken().access_token}` }),
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to save file: ${errorBody?.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.id;
};

export const loadFileFromDrive = async (fileId: string): Promise<string> => {
  await gapi.client.load(DISCOVERY_DOC);
  const response = await gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });
  return response.body;
};

const tibify = require('./tibify.js');
const electron = require('electron');
const ipc = require('electron').ipcMain;
const notifier = require('node-notifier');
const request = require('request-promise');


const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

let mainWindow;
let tib = new tibify();

function createWindow () {
  mainWindow = new BrowserWindow({width: 600, height: 400, resizable: false});
  mainWindow.setMenu(null);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.on('closed', function () {
    mainWindow = null
  });
}

app.on('ready', function() {
  createWindow();
  setInterval(() => { updateAndNotify(); }, 60000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipc.on('valueReceived', function(event, data) {
  queryApi(data);
});

function queryApi(username) {
  tib.getUserData(username).then((data) => {
    tib.saveNewUserData(JSON.parse(data));
  });
}

function updateAndNotify() {
  if (tib.configFileExists()) {
    tib.updateConfigInfo().then(() => { 
      let data = tib.retrieveCurrentData();

      Object.keys(data).forEach(key => {
        tib.updatePreviouslyOnlineUsers(key);
      });

      notifyUserOnline();
      displayNumberOfUsersOnline();
    });
  }
}

function notifyUserOnline() {
  for (var i = 0; i < tib.notifyNames.length; i++) {
    notifier.notify({
      'title': 'Tibify',
      'message': `${tib.notifyNames[i]} is now online!`,
      'icon': __dirname + '/icons/Outfit_Citizen_Male.gif'
    });
    tib.notifyNames.splice(tib.notifyNames[i],1);
  }
}

function displayNumberOfUsersOnline() {
  let numberOfUsers = Object.keys(tib.previouslyOnlineUsers).length;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('usersOnline', numberOfUsers);    
  });
  
  mainWindow.webContents.send('usersOnline', numberOfUsers);
}
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
let notifications = {};

function createWindow () {
  mainWindow = new BrowserWindow({width: 600, height: 400, resizable: false});
  // mainWindow.setMenu(null);

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
  setInterval(() => { updateAndNotify(); }, 20000);
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
  notifications[data.name] = data;
  tib.getUserData(data.name).then((data) => {
    tib.saveNewUserData(JSON.parse(data));
  });
});

function updateAndNotify() {
  if (tib.configFileExists()) {
    tib.updateUserData().then(() => { 
      let data = tib.retrieveCurrentData();

      Object.keys(data).forEach(key => {
        if (notifications[key].online !== undefined && notifications[key].online) {
          tib.updatePreviouslyOnlineUsers(key);
        }
        if (notifications[key].death !== undefined && notifications[key].death) {
          tib.updateUserDeaths(key);
        }
      });

      notifyUserDeath();
      notifyUserOnline();
      displayNumberOfUsersOnline();
    });
  }
}

function notifyUserOnline() {
  for (var i = 0; i < tib.currentOnlineUsers.length; i++) {
    notifier.notify({
      'title': 'Tibify',
      'message': `${tib.currentOnlineUsers[i]} is now online!`,
      'icon': __dirname + '/icons/Outfit_Citizen_Male.gif'
    });
    tib.currentOnlineUsers.splice(tib.currentOnlineUsers[i],1);
  }
}

function displayNumberOfUsersOnline() {
  let numberOfUsers = Object.keys(tib.previouslyOnlineUsers).length;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('usersOnline', numberOfUsers);    
  });
  
  mainWindow.webContents.send('usersOnline', numberOfUsers);
}

function notifyUserDeath() {
  let today = new Date();
  today.setHours(today.getHours() + 2);
  today = today.toISOString().substr(0, 10);

  for (let i = 0; i < tib.userDeaths.length; i++) {
    for (let d = 0; d < tib.userDeaths[i].deaths.length; d++) {
      if (tib.userDeaths[i].deaths[d].date.date.substr(0,11).indexOf(today) !== -1 && tib.userDeaths[i].notified === false) {
        tib.userDeaths[i].notified = true;
        sendDeathNotification(tib.userDeaths[i].name);
      }
    }
  }
}

function sendDeathNotification(username) {
  notifier.notify({
    'title': 'Tibify',
    'message': `${username} died today!`,
    'icon': __dirname + '/icons/Dead_Human.gif'
  });
}
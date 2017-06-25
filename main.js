const fs = require('fs');
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
  let configData = tib.getFileData('config');

  if (!configData.hasOwnProperty[data.name]) {
    configData[data.name] = data;
    tib.saveConfigData(configData);
  }

  tib.getUserData(data.name).then((data) => {
    tib.saveNewUserData(JSON.parse(data));
  });
});

function updateAndNotify() {
  if (!fs.existsSync('./data.json')) {
    return;
  }

  tib.updateUserData().then(() => { 
    let configData = tib.getFileData('config');

    Object.keys(configData).forEach(user => {
      if (configData[user].online) {
        tib.updatePreviouslyOnlineUsers(user);
      }
      if (configData[user].death) {
        tib.updateUserDeaths(user);
      }
      if (configData[user].level) {
        tib.updateUserLevels(user);
      }
    });
    notifyUserDeath();
    notifyUserOnline();
    notifyUserLevel();
    displayNumberOfUsersOnline();
  });
}

function notifyUserDeath() {
  let today = new Date();
  let icon = 'Dead_Human.gif';
  let message = ' has died today!';
  today.setHours(today.getHours() + 2);
  today = today.toISOString().substr(0, 10);

  for (let i = 0; i < tib.userDeaths.length; i++) {
    for (let d = 0; d < tib.userDeaths[i].deaths.length; d++) {
      if (tib.userDeaths[i].deaths[d].date.date.substr(0,11).indexOf(today) !== -1 && tib.userDeaths[i].notified === false) {
        tib.userDeaths[i].notified = true;
        sendNotification(tib.userDeaths[i].name + message, icon);
      }
    }
  }
}

function notifyUserOnline() {
  let message = ' is now online!';
  let icon = 'Outfit_Citizen_Male.gif';

  for (let i = 0; i < tib.currentOnlineUsers.length; i++) {
    sendNotification(tib.currentOnlineUsers[i] + message, icon);
    tib.currentOnlineUsers.splice(tib.currentOnlineUsers[i],1);
  }
}

function notifyUserLevel() {
  let message = ' gained a level!';
  let icon = 'Outfit_Citizen_Male.gif';

  for (let i = 0; i < tib.userLevels.length; i++) {
    if (tib.userLevels[i].notified === false) {
      tib.userLevels[i].notified = true; 
      sendNotification(tib.userLevels[i].name + message, icon);
    }
  }
}

function displayNumberOfUsersOnline() {
  let numberOfUsers = Object.keys(tib.previouslyOnlineUsers).length;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('usersOnline', numberOfUsers);    
  });
  
  mainWindow.webContents.send('usersOnline', numberOfUsers);
}

function sendNotification(message, icon) {
  notifier.notify({
    'title': 'Tibify',
    'message': message,
    'icon': __dirname + `/assets/icons/${icon}`
  });
}
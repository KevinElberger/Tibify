const fs = require('fs');
const tibify = require('./tibify.js');
const electron = require('electron');
const ipc = require('electron').ipcMain;
const notifier = require('node-notifier');
const request = require('request-promise');
const path = require('path');
const url = require('url');

const app = electron.app;
const {Menu, Tray} = require('electron');
const refreshRate = 30000 * 1;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;
let tray = null;
let tib = new tibify();
let notifications = {};

function createWindow () {
  mainWindow = new BrowserWindow({width: 700, height: 500, resizable: false});
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
  createTray();
  updateAndNotify();
  setInterval(updateAndNotify, refreshRate);
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

ipc.on('getUser', (event, data) => {
  let userData = {};
  let configData = tib.getFileData('config');

  userData['config'] = configData[data];

  tib.getUserData(data).then(data => {
    userData['user'] = data;
    mainWindow.webContents.send('setUser', userData);   
  }); 
});

ipc.on('updateUser', (event, data) => {
  let configData = tib.getFileData('config');

  configData[data.name] = data;
  tib.saveConfigData(configData);
});

ipc.on('valueReceived', (event, data) => {
  let configData = tib.getFileData('config');

  if (!configData.hasOwnProperty[data.name]) {
    configData[data.name] = data;
    tib.saveConfigData(configData);
  }

  tib.getUserData(data.name).then(data => {
    if (JSON.parse(data).characters.error) {
      sendNotification(JSON.parse(data).characters.error);
      return;
    }

    if (JSON.parse(data).characters.other_characters.length < 1) {
      tib.getWorldData(JSON.parse(data).characters.data.world).then(world => {
        tib.worldData[JSON.parse(data).characters.data.name] = world;
      });
    }
    tib.saveNewUserData(JSON.parse(data));
  });
});

function createTray() {
  tray = new Tray(`${__dirname}/assets/icons/The_Holy_Tible.png`);
  buildContextMenu(0);
  tray.setToolTip('Tibify');
}

function updateAndNotify() {
  const dataFile = './data.json';

  if (!fs.existsSync(dataFile)) {
    return;
  }

  tib.updateUserData().then(() => tib.updateWorldData()).then(world => {
    if (world.length < 1) {
      return;
    }
    saveWorldDataByUser(world);
  }).then(() => {
    updateUserInformation();
    displayUsers();
    notifyUserDeath();
    notifyUserOnline();
    notifyUserLevel();
  });
}

function saveWorldDataByUser(world) {
  let data = tib.getFileData('data');

  Object.keys(data).forEach(key => {
    tib.worldData[data[key].characters.data.name] = JSON.parse(world);
  });
}

function updateUserInformation() {
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
}

function notifyUserDeath() {
  let today = new Date();
  const icon = 'Dead_Human.gif';
  const message = ' has died today!';
  let cestTime = today.setHours(today.getHours() + 2);
  cestTime = today.toISOString().substr(0, 10);

  tib.userDeaths.forEach(user => {
    user.deaths.forEach(death => {
      if (death.date.date.substr(0,11).indexOf(cestTime) !== -1 && !user.notified) {
        user.notified = true;
        sendNotification(user.name + message, icon);
      }
    });
  });
}

function notifyUserOnline() {
  const message = ' is now online!';
  const icon = 'Outfit_Citizen_Male.gif';

  tib.currentOnlineUsers.forEach((user, index) => {
    sendNotification(user + message, icon);
    tib.currentOnlineUsers.splice(index, 1);
  });
}

function notifyUserLevel() {
  const message = ' gained a level!';
  const icon = 'Outfit_Citizen_Male.gif';

  tib.userLevels.forEach(function(user) {
    if (!user.notified && user.leveledUp) {
      user.notified = true;
      sendNotification(user.name + message, icon);
    }
  });
}

function displayUsers() {
  let data = {};
  let allUsers = [];
  let onlineUsers = [];
  let totalUsers = tib.getFileData('data');
  let numberOfUsers = Object.keys(tib.previouslyOnlineUsers).length;
  
  Object.keys(totalUsers).forEach(user => {
    allUsers.push(user);
  });

  Object.keys(tib.previouslyOnlineUsers).forEach(user => {
    onlineUsers.push(user);
  });

  data['allUsers'] = allUsers;
  data['onlineUsers'] = onlineUsers;
  data['numberOfUsers'] = numberOfUsers;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('usersOnline', numberOfUsers);    
  });

  buildContextMenu(data['numberOfUsers']);
  mainWindow.webContents.send('usersOnline', data);
}

function buildContextMenu(data) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${data} Online`
    },
    {
      label: 'About',
      click () { require('electron').shell.openExternal('https://github.com/KevinElberger/Tibify.git'); }
    },
    {
      label: 'Exit',
      role: 'quit'
    }
  ]);
  tray.setContextMenu(contextMenu);  
}

function sendNotification(message, icon) {
  notifier.notify({
    'title': 'Tibify',
    'message': message,
    'icon': `${__dirname}/assets/icons/${icon}`
  });
}
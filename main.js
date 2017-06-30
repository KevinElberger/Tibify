const fs = require('fs');
const tibify = require('./tibify.js');
const electron = require('electron');
const ipc = require('electron').ipcMain;
const notifier = require('node-notifier');
const request = require('request-promise');
const path = require('path');
const url = require('url');

const app = electron.app;
const refreshRate = 20000 * 1;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;
let tib = new tibify();
let notifications = {};

function createWindow () {
  mainWindow = new BrowserWindow({width: 700, height: 500, resizable: false});
  //mainWindow.setMenu(null);

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

ipc.on('valueReceived', (event, data) => {
  let configData = tib.getFileData('config');

  if (!configData.hasOwnProperty[data.name]) {
    configData[data.name] = data;
    tib.saveConfigData(configData);
  }

  tib.getUserData(data.name).then(data => {
    if (JSON.parse(data).characters.error) {
      console.log(JSON.parse(data).characters.error);
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

function updateAndNotify() {
  const dataFile = './data.json';
  
  if (!fs.existsSync(dataFile)) {
    return;
  }

  tib.updateUserData().then(() => { tib.updateWorldData(); }).then(() => {
    let configData = tib.getFileData('config');

    Object.keys(configData).forEach(user => {
      updateUserInformation(configData, user);
    });

    displayOnlineUsers();
    notifyUserDeath();
    notifyUserOnline();
    notifyUserLevel();
  });
}

function updateUserInformation(data, user) {
  if (data[user].online) {
    tib.updatePreviouslyOnlineUsers(user);
  }
  if (data[user].death) {
    tib.updateUserDeaths(user);
  }
  if (data[user].level) {
    tib.updateUserLevels(user);
  }
}

function notifyUserDeath() {
  let today = new Date();
  const icon = 'Dead_Human.gif';
  const message = ' has died today!';
  let cestTime = today.setHours(today.getHours() + 2);
  cestTime = today.toISOString().substr(0, 10);

  tib.userDeaths.forEach(user => {
    user.deaths.forEach(death => {
      if (death.date.date.substr(0,11).indexOf(cestTime) !== -1 && user.notified === false) {
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

function displayOnlineUsers() {
  let data = {};
  let userNames = [];
  let numberOfUsers = Object.keys(tib.previouslyOnlineUsers).length;
  
  Object.keys(tib.previouslyOnlineUsers).forEach(user => {
    userNames.push(user);
  });

  data['userNames'] = userNames;
  data['numberOfUsers'] = numberOfUsers;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('usersOnline', numberOfUsers);    
  });

  mainWindow.webContents.send('usersOnline', data);
}

function sendNotification(message, icon) {
  notifier.notify({
    'title': 'Tibify',
    'message': message,
    'icon': `${__dirname}/assets/icons/${icon}`
  });
}
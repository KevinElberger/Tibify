const fs = require('fs');
const url = require('url');
const path = require('path');
const tib = require('./tibify.js');
const EventFactory = require('./event-factory.js');
const electron = require('electron');
const ipc = require('electron').ipcMain;
const request = require('request-promise');

const app = electron.app;
const refreshRate = 1000 * 10;
const {Menu, Tray} = require('electron');
const BrowserWindow = electron.BrowserWindow;
const iconPath = `${__dirname}/assets/icons/The_Holy_Tible.png`;

let mainWindow;
let tray = null;
let events = null;
let notifications = {};
let configData = tib.getFileData('config');

function createWindow () {
  mainWindow = new BrowserWindow({width: 700, height: 500, resizable: false});
  mainWindow.setMenu(null);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.on('closed', () => {
    mainWindow = null
  });
}

app.on('ready', () => {
  createWindow();
  createTray(iconPath);
  events = buildEvents();
  updateAndNotify();
  setInterval(updateAndNotify, refreshRate);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipc.on('getUser', (event, name) => {
  let userData = {};

  userData['config'] = configData[name];
  tib.getUserData(name).then(data => {
    userData['user'] = data;
    mainWindow.webContents.send('setUser', userData);   
  }); 
});

ipc.on('updateUser', (event, data) => {
  configData[data.name] = data;
  tib.saveConfigData(configData);
});

ipc.on('valueReceived', (event, data) => {
  if (!configData.hasOwnProperty[data.name]) {
    configData[data.name] = data;
    tib.saveConfigData(configData);
  }

  tib.getUserData(data.name).then(data => {
    let userData = JSON.parse(data);
    if (userData.characters.error) {
      return;
    }

    if (userData.characters.other_characters.length < 1) {
      tib.getWorldData(userData.characters.data.world).then(world => {
        tib.worldData[userData.characters.data.name] = world;
      });
    }
    tib.saveNewUserData(userData);
  });
});

function buildEvents() {
  let events = [];
  let factory = new EventFactory();

  events.push(factory.createEvent('Death'));
  events.push(factory.createEvent('Online'));
  events.push(factory.createEvent('Level'));
  return events;
}

function createTray(icon) {
  tray = new Tray(icon);
  buildContextMenu(0);
  tray.setToolTip('Tibify');
}

function updateAndNotify() {
  const dataFile = './data.json';
  if (!fs.existsSync(dataFile)) {
    return;
  }

  tib.updateUserData().then(() => tib.updateWorldData()).then(world => {
    if (world.length > 0) {
      saveWorldDataByUser(world);
    }
  }).then(() => {
    updateUserInformation();
    displayUsers();
    events.forEach((event) => event.run());
  });
}

function saveWorldDataByUser(world) {
  let data = tib.getFileData('data');

  Object.keys(data).forEach(key => {
    tib.worldData[data[key].characters.data.name] = JSON.parse(world);
  });
}

function updateUserInformation() {
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

function buildContextMenu(userCount) {
  let link = 'https://github.com/KevinElberger/Tibify.git';
  const contextMenu = Menu.buildFromTemplate([
    {label: `${userCount} Online`},
    {label: 'About', click () { require('electron').shell.openExternal(link); }},
    {label: 'Exit', role: 'quit'}
  ]);
  tray.setContextMenu(contextMenu);  
}
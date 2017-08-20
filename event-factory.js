const tib = require('./tibify.js');
const notifier = require('node-notifier');

function EventFactory()  {
    this.createEvent = function(type) {
        let event;

        if (type === 'Death') {
            event = new DeathEvent();
        } else if (type === 'Online') {
            event = new OnlineEvent();
        } else if (type === 'Level') {
            event = new LevelEvent();
        }

        event.run = function() {
            this.userList.forEach(this.callback);
        };

        return event;
    }
}

function DeathEvent() {
    this.icon = 'Dead_Human.gif';
    this.message = ' has died today!';
    this.userList = tib.userDeaths;
    this.callback = (user) => {
        user.deaths.forEach(death => {
        if (this.userDiedToday(death.date.date) && !user.notified) {
            user.notified = true;
            sendNotification(user.name + this.message, this.icon);
        }
        });
    };
    this.userDiedToday = function() {
        let today = new Date();
        let cestTime = today.setHours(today.getHours() + 2);
        cestTime = today.toISOString().substr(0, 10);
        return date.substr(0, 11).match(cestTime);
    }
}

function OnlineEvent() {
    this.icon = 'Outfit_Citizen_Male.gif';
    this.message = ' is now online!';
    this.userList = tib.currentOnlineUsers;
    this.callback = (user, index) => {
        sendNotification(user + this.message, this.icon);
        tib.currentOnlineUsers.splice(index, 1);
    };
}

function LevelEvent() {
    this.icon = 'Outfit_Citizen_Male.gif';
    this.message = ' has gained a level!';
    this.userList = tib.userLevels;
    this.callback = (user) => {
        if (!user.notified && user.leveledUp) {
        user.notified = true;
        sendNotification(user.name + this.message, this.icon);
        }
    };
}

function sendNotification(message, icon) {
    notifier.notify({
      'title': 'Tibify',
      'message': message,
      'icon': `${__dirname}/assets/icons/${icon}`
    });
}

module.exports = EventFactory;
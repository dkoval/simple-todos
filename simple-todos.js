Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
    // This code only runs on the server
    Meteor.publish("tasks", function () {
        // Only publish tasks that are public or belong to the current user
        return Tasks.find({
            $or: [
                {private: false},
                {owner: this.userId}
            ]
        });
    });
}

if (Meteor.isClient) {
    // This code only runs on the client
    Meteor.subscribe("tasks");

    Template.body.helpers({
        tasks: function () {
            // always display the newest tasks first
            if (Session.get("hideCompleted")) {
                // If hide completed is checked, filter tasks
                return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
            } else {
                // otherwise, return all of the tasks
                return Tasks.find({}, {sort: {createdAt: -1}});
            }
        },
        hideCompleted: function () {
            return Session.get("hideCompleted");
        },
        incompleteCount: function () {
            return Tasks.find({checked: {$ne: true}}).count();
        }
    });

    Template.body.events({
        "submit .new-task": function (event) {
            // Prevent default browser form submit
            event.preventDefault();

            // Get value from form element
            var text = event.target.text.value;

            // Insert a task into the collection
            Meteor.call("addTask", text);

            // Clear form
            event.target.text.value = "";
        },
        "change .hide-completed input": function (event) {
            Session.set("hideCompleted", event.target.checked);
        }
    });

    Template.task.helpers({
        isOwner: function () {
            return this.owner === Meteor.userId();
        }
    });

    Template.task.events({
        "click .toggle-checked": function () {
            // Set the checked property to the opposite of its current value
            Meteor.call("setChecked", this._id, !this.checked);
        },
        "click .toggle-private": function () {
            // Set the private property to the opposite of its current value
            Meteor.call("setPrivate", this._id, !this.private);
        },
        "click .delete": function () {
            // Delete a task
            Meteor.call("deleteTask", this._id);
        }
    });

    // Configure the accounts UI to use usernames instead of email addresses
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

Meteor.methods({
    addTask: function (text) {
        // Make sure the user is logged in before inserting a task
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.insert({
            text: text,
            createdAt: new Date(),           // current time
            owner: Meteor.userId(),          // id of the user that created the task
            username: Meteor.user().username // `username of the user that created the task
        });
    },
    setChecked: function (taskId, setToChecked) {
        // If the task is private, make sure only the owner can check it off
        var task = Tasks.findOne(taskId);
        if (task.private && task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.update(taskId, {$set: {checked: setToChecked}});
    },
    setPrivate: function (taskId, setToPrivate) {
        // Make sure only the task owner can make a task private
        var task = Tasks.findOne(taskId);
        if (task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.update(taskId, {$set: {private: setToPrivate}});
    },
    deleteTask: function (taskId) {
        // If the task is private, make sure only the owner can delete it
        var task = Tasks.findOne(taskId);
        if (task.private && task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.remove(taskId);
    }
});

import { Meteor } from 'meteor/meteor';
import { Tasks } from '../imports/api/tasks/tasks';
import '../imports/api/tasks/methods';

Meteor.startup(async () => {
  /**
   * Publish all tasks, sorted by their `order` field so clients
   * always receive them in the correct drag-and-drop sequence.
   */
  Meteor.publish('tasks', function publishTasks() {
    return Tasks.find({}, { sort: { order: 1, createdAt: 1 } });
  });
});

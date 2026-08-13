import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Tasks } from './tasks';

Meteor.methods({
  /**
   * Insert a new task.
   * @param {string} text     - Task description
   * @param {string} category - One of: Work, Personal, Urgent, Other
   */
  async 'tasks.insert'(text, category) {
    check(text, String);
    check(category, String);

    const validCategories = ['Work', 'Personal', 'Urgent', 'Other'];
    const safeCategory = validCategories.includes(category) ? category : 'Other';

    if (!text.trim()) {
      throw new Meteor.Error('invalid-text', 'Task text cannot be empty.');
    }

    // Place new task at the bottom of the list (Meteor 3 async API)
    const maxOrderTask = await Tasks.findOneAsync({}, { sort: { order: -1 }, fields: { order: 1 } });
    const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

    return Tasks.insertAsync({
      text: text.trim(),
      checked: false,
      category: safeCategory,
      order: nextOrder,
      createdAt: new Date(),
    });
  },

  /**
   * Toggle the checked state of a task.
   * @param {string}  taskId  - The task _id
   * @param {boolean} checked - New checked value
   */
  async 'tasks.setChecked'(taskId, checked) {
    check(taskId, String);
    check(checked, Boolean);

    await Tasks.updateAsync(taskId, { $set: { checked } });
  },

  /**
   * Remove a task permanently.
   * @param {string} taskId - The task _id
   */
  async 'tasks.remove'(taskId) {
    check(taskId, String);
    await Tasks.removeAsync(taskId);
  },

  /**
   * Reorder tasks after a drag-and-drop operation.
   * @param {string[]} orderedIds - Array of task _ids in new visual order
   */
  async 'tasks.reorder'(orderedIds) {
    check(orderedIds, [String]);

    const updates = orderedIds.map((id, index) =>
      Tasks.updateAsync(id, { $set: { order: index } })
    );
    await Promise.all(updates);
  },

  /**
   * Edit the text of an existing task.
   * @param {string} taskId  - The task _id
   * @param {string} newText - Updated task text
   */
  async 'tasks.updateText'(taskId, newText) {
    check(taskId, String);
    check(newText, String);

    if (!newText.trim()) {
      throw new Meteor.Error('invalid-text', 'Task text cannot be empty.');
    }

    await Tasks.updateAsync(taskId, { $set: { text: newText.trim() } });
  },

  /**
   * Update the category of an existing task.
   * @param {string} taskId   - The task _id
   * @param {string} category - New category value
   */
  async 'tasks.updateCategory'(taskId, category) {
    check(taskId, String);
    check(category, String);

    const validCategories = ['Work', 'Personal', 'Urgent', 'Other'];
    const safeCategory = validCategories.includes(category) ? category : 'Other';

    await Tasks.updateAsync(taskId, { $set: { category: safeCategory } });
  },
});

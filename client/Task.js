import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { CATEGORIES } from '../imports/api/tasks/tasks';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
Template.Task.helpers({
  /** Returns the emoji icon for this task's category */
  categoryIcon() {
    return CATEGORIES[this.category]?.icon || '📌';
  },
});

// ─────────────────────────────────────────────
//  Events
// ─────────────────────────────────────────────
Template.Task.events({

  /** Toggle checked state */
  'change .task-checkbox'(event) {
    Meteor.callAsync('tasks.setChecked', this._id, event.target.checked)
      .catch((err) => console.error('setChecked error:', err));
  },

  /** Delete task */
  'click .delete-btn'(event) {
    event.stopPropagation();
    Meteor.callAsync('tasks.remove', this._id)
      .catch((err) => console.error('remove error:', err));
  },

  /** Inline edit on double-click */
  'dblclick .task-text'(event, instance) {
    const span = event.currentTarget;
    const currentText = span.textContent.trim();

    // Replace span with an input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'task-inline-edit';
    span.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const newText = input.value.trim();
      if (newText && newText !== currentText) {
        Meteor.callAsync('tasks.updateText', instance.data._id, newText)
          .catch((err) => console.error('updateText error:', err));
      }
      // Blaze will re-render the span automatically after the method call
      // In case it doesn't (optimistic UI), restore manually
      input.replaceWith(span);
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  commit();
      if (e.key === 'Escape') input.replaceWith(span); // cancel
    });
  },
});

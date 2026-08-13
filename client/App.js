import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import Sortable from 'sortablejs';

import { Tasks, CATEGORIES, CATEGORY_LIST } from '../imports/api/tasks/tasks';
import '../imports/api/tasks/methods';

// Import HTML templates FIRST so Blaze registers them before JS helpers run
import './Task.html';
import './App.html';
import './Task.js';

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
Template.App.onCreated(function appOnCreated() {
  this.activeCategory = new ReactiveVar('all');
  this.hideCompleted  = new ReactiveVar(false);
  this.subscribe('tasks');
});

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
Template.App.helpers({

  isLoading() {
    return !Template.instance().subscriptionsReady();
  },

  /** Filtered + sorted task list */
  tasks() {
    const instance    = Template.instance();
    const cat         = instance.activeCategory.get();
    const hideDone    = instance.hideCompleted.get();

    const filter = {};
    if (cat !== 'all') filter.category = cat;
    if (hideDone)       filter.checked  = false;

    return Tasks.find(filter, { sort: { order: 1, createdAt: 1 } });
  },

  hasTasks() {
    const instance = Template.instance();
    const cat      = instance.activeCategory.get();
    const hideDone = instance.hideCompleted.get();
    const filter   = {};
    if (cat !== 'all') filter.category = cat;
    if (hideDone)       filter.checked  = false;
    return Tasks.find(filter).count() > 0;
  },

  /** Category list for sidebar nav, each enriched with a live count */
  categories() {
    return CATEGORY_LIST.map(key => ({
      key,
      ...CATEGORIES[key],
      count: Tasks.find({ category: key }).count(),
    }));
  },

  totalCount() {
    return Tasks.find().count();
  },

  completedCount() {
    return Tasks.find({ checked: true }).count();
  },

  incompleteCount() {
    return Tasks.find({ checked: false }).count();
  },

  incompleteCountPlural() {
    return Tasks.find({ checked: false }).count() !== 1;
  },

  /** Returns true when the given category key matches the active filter */
  isActiveCategory(key) {
    return Template.instance().activeCategory.get() === key;
  },

  activeCategoryLabel() {
    const cat = Template.instance().activeCategory.get();
    return cat === 'all' ? 'All' : CATEGORIES[cat]?.label || cat;
  },

  hideCompleted() {
    return Template.instance().hideCompleted.get();
  },

  /** SVG circle progress ring dasharray for current completion % */
  progressDash() {
    const total     = Tasks.find().count();
    const completed = Tasks.find({ checked: true }).count();
    const pct       = total === 0 ? 0 : completed / total;
    const circ      = 2 * Math.PI * 26; // r=26
    return `${(pct * circ).toFixed(1)} ${circ.toFixed(1)}`;
  },

  completionPct() {
    const total     = Tasks.find().count();
    const completed = Tasks.find({ checked: true }).count();
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  },
});

// ─────────────────────────────────────────────
//  Events
// ─────────────────────────────────────────────
Template.App.events({

  /** Add new task on form submit */
  'submit #add-task-form'(event, instance) {
    event.preventDefault();
    const input    = instance.find('#task-text-input');
    const catSelect = instance.find('#task-category-select');
    const text     = input.value.trim();
    const category = catSelect.value;

    if (!text) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
      return;
    }

    Meteor.callAsync('tasks.insert', text, category)
      .then(() => {
        input.value = '';
        input.focus();
      })
      .catch((err) => {
        console.error('tasks.insert error:', err);
      });
  },

  /** Switch active category filter */
  'click .nav-item'(event, instance) {
    const cat = event.currentTarget.dataset.category;
    instance.activeCategory.set(cat);
  },

  /** Toggle hide-completed switch */
  'change #toggle-hide-completed'(event, instance) {
    instance.hideCompleted.set(event.target.checked);
  },
});

// ─────────────────────────────────────────────
//  Drag-and-Drop (SortableJS)
// ─────────────────────────────────────────────
Template.App.onRendered(function appOnRendered() {
  const instance = this;
  let sortableInstance = null;

  /**
   * We use autorun so that SortableJS is re-initialised whenever the
   * reactive task list changes (e.g., after filtering). This keeps the
   * drag handles in sync with the current DOM.
   */
  instance.autorun(() => {
    // Trigger reactivity by reading the subscription state
    if (!instance.subscriptionsReady()) return;

    Meteor.defer(() => {
      const listEl = instance.find('#task-list');
      if (!listEl) return;

      // Destroy previous instance to avoid double-binding
      if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
      }

      sortableInstance = Sortable.create(listEl, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'task-ghost',
        chosenClass: 'task-chosen',
        dragClass: 'task-dragging',

        onEnd(evt) {
          // Collect the new order from the DOM after drag ends
          const items = listEl.querySelectorAll('.task-item[data-id]');
          const orderedIds = Array.from(items).map(el => el.dataset.id);
          Meteor.callAsync('tasks.reorder', orderedIds)
            .catch((err) => {
              console.error('tasks.reorder error:', err);
            });
        },
      });
    });
  });
});

/**
 * Task list extensions for cell-doc.
 *
 * Node contract:
 *   taskList  -> backend task_list
 *   taskItem  -> backend task_item  (nesting disabled)
 */
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import type { Extensions } from '@tiptap/core';

export function buildTaskListExtensions(): Extensions {
  return [
    TaskList,
    TaskItem.configure({ nested: false }),
  ];
}

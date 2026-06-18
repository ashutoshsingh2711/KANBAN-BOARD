// ---------- ELEMENT REFERENCES ----------

const todo = document.querySelector('#todo');
const progress = document.querySelector('#progress');
const done = document.querySelector('#done');

const toggleModalButton = document.querySelector('#toggle-modal');
const modal = document.querySelector('.modal');
const modalBg = document.querySelector('.modal .bg');
const addTaskButton = document.querySelector('#add-new-task');
const cancelTaskButton = document.querySelector('#cancel-task');

const taskTitleInput = document.querySelector('#task-title-input');
const taskDescInput = document.querySelector('#task-desc-input');
const taskDueInput = document.querySelector('#task-due-input');

const allColumns = [todo, progress, done];

let dragElement = null;

// ---------- HELPER: UPDATE TASK COUNT FOR A COLUMN ----------

function updateColumnCount(column) {
    const count = column.querySelectorAll('.task').length;
    column.querySelector('.count').textContent = count;
}

function updateAllCounts() {
    allColumns.forEach(updateColumnCount);
}

// ---------- HELPER: CLEAR MODAL INPUTS ----------

function clearModalInputs() {
    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskDueInput.value = '';
}

// ---------- DUE DATE TRACKING ----------

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Returns 'overdue', 'due-soon', or 'upcoming' based on how close the due date is
function getDueStatus(dueDateMs) {
    const now = Date.now();
    const diff = dueDateMs - now;

    if (diff < 0) return 'overdue';
    if (diff <= ONE_DAY_MS) return 'due-soon';
    return 'upcoming';
}

// Formats a due date into a short readable label, e.g. "Due Jun 18, 3:00 PM"
function formatDueLabel(dueDateMs, status) {
    const date = new Date(dueDateMs);
    const formatted = date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    if (status === 'overdue') return `Overdue · ${formatted}`;
    if (status === 'due-soon') return `Due soon · ${formatted}`;
    return `Due ${formatted}`;
}

// Reads the due date off a task element and updates its badge + border accent
function refreshTaskDueState(task) {
    const dueAttr = task.getAttribute('data-due');
    if (!dueAttr) return; // task has no due date set

    const dueDateMs = Number(dueAttr);
    const status = getDueStatus(dueDateMs);

    // update border accent classes
    task.classList.remove('due-soon', 'overdue');
    if (status === 'due-soon' || status === 'overdue') {
        task.classList.add(status);
    }

    // update badge text + color
    const badge = task.querySelector('.due-badge');
    if (badge) {
        badge.textContent = formatDueLabel(dueDateMs, status);
        badge.classList.remove('upcoming', 'due-soon', 'overdue');
        badge.classList.add(status);
    }
}

// Re-checks every task's due status across the whole board
function refreshAllDueStates() {
    document.querySelectorAll('.task').forEach(refreshTaskDueState);
}

// ---------- HELPER: ATTACH DRAG EVENT TO A TASK ----------
// Needed for BOTH pre-existing tasks and tasks created later via the modal

function addDragEventOnTask(task) {
    task.addEventListener('dragstart', (e) => {
        dragElement = task;
        task.classList.add('dragging');
    });

    task.addEventListener('dragend', (e) => {
        task.classList.remove('dragging');
    });
}

// Attach drag behavior to any tasks already present in the HTML on page load
document.querySelectorAll('.task').forEach(addDragEventOnTask);

// ---------- HELPER: ATTACH DROP-ZONE EVENTS TO A COLUMN ----------

function addDragEventsOnColumn(column) {
    column.addEventListener('dragenter', (e) => {
        e.preventDefault();
        column.classList.add('hover-over');
    });

    column.addEventListener('dragleave', (e) => {
        e.preventDefault();
        column.classList.remove('hover-over');
    });

    column.addEventListener('dragover', (e) => {
        e.preventDefault(); // required to allow dropping
    });

    column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('hover-over');

        if (!dragElement) return;

        const sourceColumn = dragElement.parentElement;

        column.appendChild(dragElement);

        // update counts for both the column the task left and the one it entered
        updateColumnCount(sourceColumn);
        updateColumnCount(column);

        dragElement = null;
    });
}

allColumns.forEach(addDragEventsOnColumn);

// ---------- MODAL OPEN / CLOSE ----------

toggleModalButton.addEventListener('click', () => {
    modal.classList.add('active');
});

modalBg.addEventListener('click', () => {
    modal.classList.remove('active');
    clearModalInputs();
});

cancelTaskButton.addEventListener('click', () => {
    modal.classList.remove('active');
    clearModalInputs();
});

// ---------- ADD TASK ----------

addTaskButton.addEventListener('click', () => {
    const taskTitle = taskTitleInput.value.trim();
    const taskDesc = taskDescInput.value.trim();
    const taskDue = taskDueInput.value; // string like "2026-06-18T15:00", or "" if not set

    if (!taskTitle) {
        taskTitleInput.focus();
        return; // block empty titles
    }

    const div = document.createElement('div');
    div.classList.add('task');
    div.setAttribute('draggable', 'true');

    div.innerHTML = `
        <h2></h2>
        <p></p>
        <div class="task-footer">
            <span class="due-badge upcoming"></span>
            <button class="delete-btn">Delete</button>
        </div>
    `;

    // set text via textContent (not innerHTML) to avoid breaking on special characters like < or &
    div.querySelector('h2').textContent = taskTitle;
    div.querySelector('p').textContent = taskDesc;

    if (taskDue) {
        const dueDateMs = new Date(taskDue).getTime();
        div.setAttribute('data-due', dueDateMs);
    } else {
        // no due date set, hide the badge entirely
        div.querySelector('.due-badge').remove();
    }

    addDragEventOnTask(div);
    addDeleteEventOnTask(div);

    todo.appendChild(div);
    updateColumnCount(todo);
    refreshTaskDueState(div);

    modal.classList.remove('active');
    clearModalInputs();
});

// ---------- DELETE TASK ----------

function addDeleteEventOnTask(task) {
    const deleteBtn = task.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        const column = task.parentElement;
        task.remove();
        updateColumnCount(column);
    });
}

// attach delete behavior to any tasks already present on page load
document.querySelectorAll('.task').forEach(addDeleteEventOnTask);

// ---------- INITIAL COUNT SETUP ----------

updateAllCounts();

// ---------- DUE DATE LIVE REFRESH ----------
// Re-check every task's due status periodically so badges update without a page reload
// (e.g. "upcoming" silently becomes "due-soon" once it crosses the 24hr mark)

refreshAllDueStates();
setInterval(refreshAllDueStates, 60 * 1000); // every 60 seconds

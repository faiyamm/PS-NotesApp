/**
 * Sistema de Gestión de Tareas
 *
 * Implementa los siguientes patrones de diseño:
 * 1. Módulo - Encapsulación de toda la lógica
 * 2. Singleton - Única instancia del gestor de tareas
 * 3. Observer - Notificación de cambios a la UI
 * 4. Factory - Creación de diferentes tipos de tareas
 * 5. Strategy - Algoritmos de filtrado por prioridad
 */

//! Patrón Módulo - Encapsulación de toda la lógica
const TodoApp = (() => {
    //! Patrón Singleton - Gestor de tareas
    const TaskManager = (() => {
        let instance
        
        function createInstance() {
            const tasks = []
            return {
                addTask: function (task) {
                    tasks.push(task)
                    this.save()
                    return task;
                },

                getTasks: () => [...tasks],
                updateTask: function (id, updateData){
                    const taskIndex = tasks.findIndex((task) => task.id === id)
                    if (taskIndex !== -1){
                        tasks[taskIndex] = { ...tasks[taskIndex], ...updateData }
                        this.save()
                        return tasks[taskIndex]
                    }
                    return null
                },
                deleteTask: function (id) {
                    const taskIndex = tasks.findIndex((task) => task.id === id)
                    if (taskIndex !== -1) {
                        const deletedTask = tasks.splice(taskIndex, 1)[0]
                        this.save()
                        return deletedTask
                    }
                    return null
                },
                toggleComplete: function (id) {
                    const taskIndex = tasks.findIndex((task) => task.id === id)
                    if (taskIndex !== -1) {
                        tasks[taskIndex].completed = !tasks[taskIndex].completed
                        this.save()
                        return tasks[taskIndex]
                    }
                    return null
                },
                load: () => {
                    const storedTasks = localStorage.getItem("tasks")
                    if (storedTasks) {
                        tasks.length = 0 // Limpiar el array
                        tasks.push(...JSON.parse(storedTasks))
                    }
                },
                save: () => {
                    localStorage.setItem("tasks", JSON.stringify(tasks))
                },
            }
        }
        return {
            getInstance: () => {
                if (!instance) {
                    instance = createInstance()
                }
                return instance
            },
        }
    }) ()

    //! Patrón Observer - Sistema de eventos
    const EventManager = (() => {
        const events = {}

        return {
            subscribe: (eventName, callback) => {
                if (!events[eventName]) {
                    events[eventName] = []
                }
                events[eventName].push(callback)
            },

            unsubscribe: (eventName, callback) => {
                if (events[eventName]) {
                    events[eventName] = events[eventName].filter((cb) => cb !== callback)
                }
            },

            notify: (eventName, data) => {
                if (events[eventName]) {
                    events[eventName].forEach((callback) => callback(data))
                }
            },
        }
    })()

    //! Patrón Factory - Creación de diferentes tipos de tareas
    const TaskFactory = (() => {
        //? Función para generar IDs únicos
        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2)
        }

        return {
            createTask: (text, priority) => ({
                id: generateId(),
                text: text,
                priority: priority,
                completed: false,
                createdAt: new Date(),
            }),
        }
    })()

    //! Patrón Strategy - Algoritmos de filtrado por prioridad
    const FilterStrategy = (() => {
        const strategies = {
            todas: (tasks) => tasks,

            baja: (tasks) => tasks.filter((task) => task.priority === "baja"),

            media: (tasks) => tasks.filter((task) => task.priority === "media"),

            alta: (tasks) => tasks.filter((task) => task.priority === "alta"),

            urgente: (tasks) => tasks.filter((task) => task.priority === "urgente"),

            completadas: (tasks) => tasks.filter((task) => task.completed),

            search: (tasks, query) => {
                if (!query) return tasks
                const lowerQuery = query.toLowerCase()
                return tasks.filter((task) => task.text.toLowerCase().includes(lowerQuery))
            },
        }

        return {
            filter: (strategyName, tasks, query) => {
                if (strategies[strategyName]) {
                    return strategies[strategyName](tasks, query)
                }
                return tasks // Estrategia por defecto
        },

            addStrategy: (name, strategyFn) => {
                strategies[name] = strategyFn
            },
        }
    })()

    //! Controlador de la UI
    const UIController = (() => {
        const DOM = {
            taskInput: document.getElementById("taskInput"),
            prioritySelect: document.getElementById("prioritySelect"),
            addTaskBtn: document.getElementById("addTaskBtn"),
            tasksList: document.getElementById("tasksList"),
            filterButtons: document.querySelectorAll(".filter-btn"),
            searchInput: document.getElementById("searchInput"),
            taskTemplate: document.getElementById("task-template"),
        }

        let currentFilter = "todas"
        let searchQuery = ""

        // Renderizar una tarea individual
        function renderTask(task) {
            const taskElement = DOM.taskTemplate.content.cloneNode(true)
            const taskItem = taskElement.querySelector(".task-item")

            // Añadir clase de prioridad
            taskItem.classList.add(`priority-${task.priority}`)

            // Si está completada, añadir clase
            if (task.completed) {
                taskItem.classList.add("task-completed")
            }

            // Establecer ID para referencia
            taskItem.dataset.id = task.id

            // Configurar texto y estado
            const checkbox = taskItem.querySelector(".task-checkbox")
            checkbox.checked = task.completed

            const taskText = taskItem.querySelector(".task-text")
            taskText.textContent = task.text

            return taskItem
        }

        return {
            init: function () {
                // Cargar tareas iniciales
                this.renderTasks()

                // Event listeners
                DOM.addTaskBtn.addEventListener("click", this.handleAddTask.bind(this))
                DOM.taskInput.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") this.handleAddTask()
                })

                DOM.tasksList.addEventListener("click", this.handleTaskAction.bind(this))

                // Filtros
                DOM.filterButtons.forEach((btn) => {
                    btn.addEventListener("click", this.handleFilterChange.bind(this))
                })

                // Búsqueda
                DOM.searchInput.addEventListener("input", this.handleSearch.bind(this))

                // Suscribirse a eventos
                EventManager.subscribe("tasksUpdated", this.renderTasks.bind(this))
            },

            renderTasks: () => {
                const taskManager = TaskManager.getInstance()
                let tasks = taskManager.getTasks()

                // Aplicar filtro actual
                tasks = FilterStrategy.filter(currentFilter, tasks)

                // Aplicar búsqueda si existe
                if (searchQuery) {
                    tasks = FilterStrategy.filter("search", tasks, searchQuery)
                }

                // Limpiar lista
                DOM.tasksList.innerHTML = ""

                // Renderizar tareas
                tasks.forEach((task) => {
                    const taskElement = renderTask(task)
                    DOM.tasksList.appendChild(taskElement)
                })
            },

            handleAddTask: () => {
                const text = DOM.taskInput.value.trim()
                const priority = DOM.prioritySelect.value

                if (text) {
                    const taskManager = TaskManager.getInstance()
                    const newTask = TaskFactory.createTask(text, priority)

                    taskManager.addTask(newTask)
                    EventManager.notify("tasksUpdated")

                    // Limpiar input
                    DOM.taskInput.value = ""
                    DOM.taskInput.focus()
                }
            },

            handleTaskAction: (e) => {
                const taskItem = e.target.closest(".task-item")
                if (!taskItem) return

                const taskId = taskItem.dataset.id
                const taskManager = TaskManager.getInstance()

                // Marcar como completada
                if (e.target.classList.contains("task-checkbox")) {
                    taskManager.toggleComplete(taskId)
                    EventManager.notify("tasksUpdated")
                }

                // Eliminar tarea
                if (e.target.classList.contains("delete-btn")) {
                    if (confirm("¿Estás seguro de eliminar esta tarea?")) {
                        taskManager.deleteTask(taskId)
                        EventManager.notify("tasksUpdated")
                    }
                }

                // Editar tarea
                if (e.target.classList.contains("edit-btn")) {
                    const tasks = taskManager.getTasks()
                    const task = tasks.find((t) => t.id === taskId)

                    if (task) {
                        const newText = prompt("Editar tarea:", task.text)
                        if (newText !== null && newText.trim() !== "") {
                            taskManager.updateTask(taskId, { text: newText.trim() })
                            EventManager.notify("tasksUpdated")
                        }
                    }
                }
            },

            handleFilterChange: function (e) {
                const filterBtn = e.target
                const filter = filterBtn.dataset.filter

                // Actualizar botones activos
                DOM.filterButtons.forEach((btn) => {
                    btn.classList.remove("active")
                })
                filterBtn.classList.add("active")

                // Actualizar filtro actual
                currentFilter = filter

                // Renderizar con nuevo filtro
                this.renderTasks()
            },

            handleSearch: function (e) {
                searchQuery = e.target.value.trim()
                this.renderTasks()
            },
        }
    })()

    //! Inicializar la aplicación
    return {
        init: () => {
        // Cargar tareas guardadas
        const taskManager = TaskManager.getInstance()
        taskManager.load()

        // Inicializar UI
        UIController.init()

        console.log("Sistema de Gestión de Tareas inicializado")
        },
    }
})() 

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    TodoApp.init()
})
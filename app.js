const express = require("express");
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const app = express();
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const dbPath = path.join(__dirname, "todoApplication.db");
app.use(express.json());

var dat = format(new Date(2016, 0, 1), "yyyy-mm-dd");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const invalidStatus = (status) => {
  if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
    return true;
  } else {
    return false;
  }
};
const invalidPriority = (priority) => {
  if (priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW") {
    return true;
  } else {
    return false;
  }
};
const invalidCategory = (category) => {
  if (category !== "WORK" && category !== "HOME" && category !== "LEARNING") {
    return true;
  } else {
    return false;
  }
};
const invalidDueDate = (dueDate) => {
  var result = isValid(new Date(dueDate));
};

// GET all Todos whose status is TO DO
app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;

  let queryParametersQuery = null;
  let isStatusValid = null;
  let isPriorityValid = null;
  let isCategoryValid = null;
  let isTodoValid = null;

  if (status !== "" && priority !== "") {
    queryParametersQuery = `status = '${status}' AND priority = '${priority}'`;

    isStatusValid = invalidStatus(status);
    isPriorityValid = invalidPriority(priority);

    if (isStatusValid) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    } else if (isPriorityValid) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  } else if (category !== "" && priority !== "") {
    queryParametersQuery = `category = '${category}' AND priority = '${priority}'`;
    isCategoryValid = invalidCategory(category);
    isPriorityValid = invalidPriority(priority);
    if (isCategoryValid) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    } else if (isPriorityValid) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  } else if (category !== "" && status !== "") {
    queryParametersQuery = `category = '${category}' AND status = '${status}'`;
    isCategoryValid = invalidCategory(category);
    isStatusValid = invalidStatus(status);
    if (isCategoryValid) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    } else if (isStatusValid) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  } else if (status !== "") {
    queryParametersQuery = `status = '${status}'`;
    isStatusValid = invalidStatus(status);
    if (isStatusValid) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  } else if (priority !== "") {
    queryParametersQuery = `priority = '${priority}'`;
    isPriorityValid = invalidPriority(priority);
    if (isPriorityValid) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  } else if (search_q !== "") {
    queryParametersQuery = `todo LIKE '%${search_q}%'`;
  } else if (category !== "") {
    queryParametersQuery = `category = '${category}'`;
    isCategoryValid = invalidCategory(category);
    if (isCategoryValid) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  const getTodosQuery =
    `
    SELECT
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
    FROM todo
    WHERE
  ` + queryParametersQuery;
  const todoArray = await db.all(getTodosQuery);
  response.send(todoArray);
});

// GET todo based on todo id
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
        FROM todo
        WHERE id = ${todoId};
    `;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

// GET todo based on date
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  const result = isValid(new Date(date));
  if (result === false) {
    response.status(400);
    response.send("Invalid Due Date");
    return;
  }
  const formattedDate = format(new Date(date), "yyyy-MM-dd");
  const getTodoQuery = `
    SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
        FROM todo
        WHERE due_date = '${formattedDate}';
    `;
  const todo = await db.all(getTodoQuery);
  response.send(todo);
});

// POST create new todo
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let isStatusValid = invalidStatus(status);
  let isPriorityValid = invalidPriority(priority);
  let isCategoryValid = invalidCategory(category);
  const result = isValid(new Date(dueDate));
  if (isStatusValid) {
    response.status(400);
    response.send("Invalid Todo Status");
    return;
  } else if (isPriorityValid) {
    response.status(400);
    response.send("Invalid Todo Priority");
    return;
  } else if (isCategoryValid) {
    response.status(400);
    response.send("Invalid Todo Category");
    return;
  } else if (result === false) {
    response.status(400);
    response.send("Invalid Due Date");
    return;
  }

  const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");

  const postTodoQuery = `
    INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES (
        ${id}, '${todo}', '${priority}', '${status}', '${category}', '${formattedDate}'
    );
  `;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

// UPDATE todo based on todo id
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const {
    status = "",
    priority = "",
    todo = "",
    dueDate = "",
    category = "",
  } = request.body;

  let isStatusValid = invalidStatus(status);
  let isPriorityValid = invalidPriority(priority);
  let isCategoryValid = invalidCategory(category);

  let updateTodoQuery = null;
  let responseSend = null;
  if (status !== "") {
    updateTodoQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`;
    if (isStatusValid) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
    responseSend = "Status Updated";
  } else if (priority !== "") {
    updateTodoQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`;
    if (isPriorityValid) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
    responseSend = "Priority Updated";
  } else if (todo !== "") {
    updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`;
    responseSend = "Todo Updated";
  } else if (category !== "") {
    updateTodoQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`;
    if (isCategoryValid) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
    responseSend = "Category Updated";
  } else if (dueDate !== "") {
    const result = isValid(new Date(dueDate));
    if (result === false) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
    const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
    updateTodoQuery = `UPDATE todo SET due_date = '${formattedDate}' WHERE id = ${todoId};`;
    responseSend = "Due Date Updated";
  }
  await db.run(updateTodoQuery);
  response.send(responseSend);
});

// DELETE todo based on todo id
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM todo WHERE id = ${todoId};
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;

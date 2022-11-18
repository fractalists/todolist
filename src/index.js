import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useState, useEffect, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

// const localTestMode = true
const localTestMode = false

const ITEM_TYPES = {
  CARD: "card",
  TASK: "task"
};

const DATASET = {
  tasks: {
    "task-1": { id: "task-1", content: "water plants" },
    "task-2": { id: "task-2", content: "buy oat milk" },
    "task-3": { id: "task-3", content: "build a trello board" },
    "task-4": { id: "task-4", content: "have a beach day" },
    "task-5": { id: "task-5", content: "build tic tac toe" }
  },
  cards: {
    "card-1": {
      id: "card-1",
      title: "Home Todos",
      taskIds: ["task-1", "task-2"]
    },
    "card-2": {
      id: "card-2",
      title: "Work Todos",
      taskIds: ["task-3"]
    },
    "card-3": { id: "card-3", title: "Fun Todos", taskIds: ["task-4"] },
    "card-4": { id: "card-4", title: "Completed", taskIds: ["task-5"] }
  },
  cardOrder: ["card-1", "card-2", "card-3", "card-4"],
  version: 0
};

const Container = styled.div`
  display: flex;
  @media (max-width: 4096px) {
    flex-flow: row wrap;
  }
  align-items: center;
  justify-items: center;
  font-family: Helvetica, Arial, sans-serif;
`;
const Menu = styled.div`
  margin: 2em;
  display: flex;
  flex-flow: row wrap;
`;
// const Note = styled.div`
//   font-size: 0.8em;
//   margin: 20px 0;
// `;
const NewCard = styled.div`
  font-size: 1em;
  color: grey;
  text-align: left;
  cursor: pointer;
  font-size: 1em;
`;

var synced = false
const localStorageKey = "franciszhang-todolist"

function getTodos() {
  if (synced || localTestMode) {
    return localStorage.getItem(localStorageKey);
  }

  const request = new XMLHttpRequest();
  request.open('GET', 'https://todo.franciszhang.org/data', false);  // `false` makes the request synchronous
  request.send(null);

  if (request.status === 200) {
    console.log(request.responseText);
    localStorage.setItem(localStorageKey, request.responseText);
    synced = true
    return request.responseText
  }
}

async function updateTodos(newData) {
  let currentDataStr = localStorage.getItem(localStorageKey);
  let currentData = JSON.parse(currentDataStr);
  let currentVersion = currentData.version;
  delete currentData['version'];
  
  console.log("current version is: " + currentVersion);

  if (JSON.stringify(currentData) === JSON.stringify(newData)) {
    return
  }

  newData.version = currentVersion + 1;
  let newDataStr = JSON.stringify(newData)

  const requestOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: newDataStr
  };

  try {
    const response = await fetch('https://todo.franciszhang.org/data', requestOptions);
    const status = response.status
    console.log("saveValue status is: " + status)
    if (status === 200) {
      localStorage.setItem(localStorageKey, newDataStr);
    } else {
      alert("failed to save changes");
    }

  } catch (err) {
    alert("network error: " + err.toString());

  } finally {
    if (localTestMode) {
      localStorage.setItem(localStorageKey, newDataStr);
    }
  }
}


function App() {
  const [dataset, ] = useState(() => {
    const savedDataset = getTodos();
    const initialValue = JSON.parse(savedDataset);
    return initialValue || DATASET;
  });

  const [tasks, setTasks] = useState(dataset.tasks);
  const [cards, setCards] = useState(dataset.cards);
  const [cardOrder, setCardOrder] = useState(dataset.cardOrder)

  useEffect(() => {
    updateTodos({
      tasks,
      cards,
      cardOrder
    });
  }, [tasks, cards, cardOrder]);

  const onAddNewCard = () => {
    const newCard = {
      id: "card-" + genRandomID(),
      title: "New Task List",
      taskIds: []
    };
    const newCardOrder = Array.from(cardOrder);
    newCardOrder.push(newCard.id);
    setCards({
      ...cards,
      [newCard.id]: newCard
    });
    setCardOrder(newCardOrder);
  };

  return (
    <Container>
      <DragDropCards
        cards={cards}
        tasks={tasks}
        cardOrder={cardOrder}
        setCards={setCards}
        setTasks={setTasks}
        setCardOrder={setCardOrder}
      />
      <Menu>
        <NewCard onClick={onAddNewCard}>+ New Card</NewCard>
      </Menu>
    </Container>
  );
}

const CardsContainer = styled.div`
  display: flex;
  @media (max-width: 4096px) {
    flex-flow: row wrap;
  }
`;
function DragDropCards({
  cards,
  tasks,
  cardOrder,
  setCards,
  setTasks,
  setCardOrder
}) {
  const [editing, setEditing] = useState(null);

  const onDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;

    if (type === ITEM_TYPES.CARD) {
      if (!destination || 
        (destination.droppableId === source.droppableId &&
        destination.index === source.index)) {
        return;
      }
      reorderCards(source, destination, draggableId);
      return;
    }
    
    // type === tasks
    if (!destination) {
      let card = cards[source.droppableId];
      onRemoveTask(Array.from(card.taskIds)[source.index], card.id)
      return;
    }

    if (destination.droppableId === source.droppableId &&
        destination.index === source.index) {
      return;
    }

    const start = cards[source.droppableId];
    const finish = cards[destination.droppableId];
    if (start.id === finish.id) {
      reorderTasksWithinCard(
        start,
        source.index,
        destination.index,
        draggableId
      );
    } else {
      moveTask(start, finish, source.index, destination.index, draggableId);
    }
  };

  const reorderCards = (source, destination, draggableId) => {
    const newCardOrder = Array.from(cardOrder);
    newCardOrder.splice(source.index, 1);
    newCardOrder.splice(destination.index, 0, draggableId);
    setCardOrder(newCardOrder);
  };

  const reorderTasksWithinCard = (
    card,
    sourceIdx,
    destinationIdx,
    draggableId
  ) => {
    const newTaskIds = Array.from(card.taskIds);
    newTaskIds.splice(sourceIdx, 1);
    newTaskIds.splice(destinationIdx, 0, draggableId);
    setCards({
      ...cards,
      [card.id]: {
        ...card,
        taskIds: newTaskIds
      }
    });
  };

  const moveTask = (start, finish, sourceIdx, destinationIdx, draggableId) => {
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(sourceIdx, 1);
    const newStart = {
      ...start,
      taskIds: startTaskIds
    };
    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destinationIdx, 0, draggableId);
    const newFinish = {
      ...finish,
      taskIds: finishTaskIds
    };
    setCards({
      ...cards,
      [newStart.id]: newStart,
      [newFinish.id]: newFinish
    });
  };

  const onAddNewTask = (cardID, content) => {
    const newTask = {
      id: "task-" + genRandomID(),
      content
    };
    setTasks({
      ...tasks,
      [newTask.id]: newTask
    });
    const newTaskIds = Array.from(cards[cardID].taskIds);
    newTaskIds.push(newTask.id);
    setCards({ ...cards, [cardID]: { ...cards[cardID], taskIds: newTaskIds } });
  };

  const onRemoveCard = (cardID) => {
    const newCardOrder = cardOrder.filter((id) => id !== cardID);
    setCardOrder(newCardOrder);

    const cardTaskIds = cards[cardID].taskIds;
    cardTaskIds.forEach((taskID) => delete tasks[taskID]);
    delete cards[cardID];
    setCards(cards);
    setTasks(tasks);
  };

  const onRemoveTask = (taskID, cardID) => {
    const newTaskIds = cards[cardID].taskIds.filter((id) => id !== taskID);
    setCards({ ...cards, [cardID]: { ...cards[cardID], taskIds: newTaskIds } });
    delete tasks[taskID];
    setTasks(tasks);
  };

  const onSaveTitleEdit = (cardID, newTitle) => {
    if (newTitle !== cards[cardID].title) {
      setCards({
        ...cards,
        [cardID]: {
          ...cards[cardID],
          title: newTitle
        }
      });
    }
    setEditing(null);
  };

  const onSaveTaskEdit = (taskID, cardID, newContent) => {
    if (newContent.trim() === "") {
      onRemoveTask(taskID, cardID);
    } else if (newContent !== tasks[taskID].content) {
      setTasks({
        ...tasks,
        [taskID]: { ...tasks[taskID], content: newContent }
      });
    }
    setEditing(null);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="all-cards" direction="horizontal" type="card">
        {(provided) => (
          <CardsContainer {...provided.droppableProps} ref={provided.innerRef}>
            {cardOrder.map((id, index) => {
              const card = cards[id];
              const cardTasks = card.taskIds.map((taskId) => tasks[taskId]);
              return (
                <Card
                  key={card.id}
                  card={card}
                  tasks={cardTasks}
                  index={index}
                  onSaveTitleEdit={(title) => onSaveTitleEdit(card.id, title)}
                  onRemoveCard={() => onRemoveCard(card.id)}
                  onAddNewTask={(content) => onAddNewTask(card.id, content)}
                  onSaveTaskEdit={(taskID, newContent) =>
                    onSaveTaskEdit(taskID, card.id, newContent)
                  }
                  onTitleDoubleClick={() => setEditing(card.id)}
                  onTaskDoubleClick={(task) => setEditing(task.id)}
                  isTitleEditing={editing === card.id}
                  isTaskEditing={(task) => editing === task.id}
                />
              );
            })}
            {provided.placeholder}
          </CardsContainer>
        )}
      </Droppable>
    </DragDropContext>
  );
}

const TitleBar = styled.div`
  display: flex;
  justify-content: space-between;
`;
const Title = styled.div`
  margin: 5px 0px 0px 5px;
  padding: 8px;
  font-size: 1em;
  color: Brown;
  border: 1px solid transparent;
  borderRadius: 2px;
  white-space: pre;
  overflow: auto;
`;
const Cross = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  text-align: right;
  color: grey;
`;
const CardContainer = styled.div`
  margin: 5px;
  border: 1px solid Gainsboro;
  border-radius: 4px;
  width: 180px;
  display: flex;
  flex-direction: column;
  background-color: white;
`;
const TaskList = styled.div`
  padding: 8px;
  background-color: ${(props) =>
    props.isDraggingOver ? "WhiteSmoke" : "inherit"};
  min-height: 100px;
  height: 100%;
`;
const NewTaskBar = styled.div`
  display: flex;
`;
const NewTaskButton = styled.div`
  padding: 8px;
  margin: 3px;
  cursor: pointer;
  text-align: right;
  color: grey;
  font-size: 0.7em;
`;

function Card(props) {
  const [isAddingNewTask, setIsAddingNewTask] = useState(false);
  const onSaveTask = (content) => {
    if (content.trim() !== "") {
      props.onAddNewTask(content);
    }
    setIsAddingNewTask(false);
  };

  return (
    <Draggable draggableId={props.card.id} index={props.index}>
      {(provided) => (
        <CardContainer
          ref={provided.innerRef}
          {...provided.draggableProps}
          id={props.card.id}
        >
          <TitleBar>
            {props.isTitleEditing ? (
              <EditInput
                key={props.card.id}
                value={props.card.title}
                onSave={props.onSaveTitleEdit}
                margin="5px 0px 0px 5px"
                padding="8px"
                fontSize="1em"
                color="Brown"
                border="1px solid"
                borderRadius="2px"
              />
            ) : (
              <Title
                onDoubleClick={props.onTitleDoubleClick}
                {...provided.dragHandleProps}
              >
                {props.card.title}
              </Title>
            )}
            <Cross onClick={props.onRemoveCard}>x</Cross>
          </TitleBar>
          <Droppable droppableId={props.card.id} type="task">
            {(provided, snapshot) => (
              <Fragment>
                <TaskList
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  isDraggingOver={snapshot.isDraggingOver}
                >
                  {props.tasks.map((task, index) => (
                    <Task
                      key={task.id}
                      task={task}
                      index={index}
                      onSaveTaskEdit={(content) =>
                        props.onSaveTaskEdit(task.id, content)
                      }
                      onTaskDoubleClick={() => props.onTaskDoubleClick(task)}
                      isTaskEditing={props.isTaskEditing(task)}
                    />
                  ))}
                </TaskList>
                {provided.placeholder}
              </Fragment>
            )}
          </Droppable>
          <NewTaskBar>
            {isAddingNewTask ? (
              <EditInput
                key="newtask"
                value=""
                onSave={onSaveTask}
                padding="8px"
                margin="0px 5px 8px 5px"
                border="1px solid"
                borderRadius="2px"
                fontSize="0.7em"
              />
            ) : (
              <NewTaskButton onClick={() => setIsAddingNewTask(true)}>
                + New Task
              </NewTaskButton>
            )}
          </NewTaskBar>
        </CardContainer>
      )}
    </Draggable>
  );
}

const TaskContainer = styled.div`
  display: flex;
`;
const TaskContent = styled.div`
  border: 1px solid Gainsboro;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 2px;
  background-color: ${(props) => (props.isDragging ? "AliceBlue" : "white")};
  width: 100%;
  font-size: 0.7em;
  white-space: pre;
  overflow: auto;
`;
function Task(props) {
  return (
    <TaskContainer>
      {props.isTaskEditing ? (
        <EditInput
          key={props.task.id}
          value={props.task.content}
          onSave={props.onSaveTaskEdit}
          padding="8px"
          margin="0 0 8px 0"
          border="1px solid"
          borderRadius="2px"
          fontSize="0.7em"
        />
      ) : (
        <Draggable draggableId={props.task.id} index={props.index}>
          {(provided, snapshot) => (
            <TaskContent
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              ref={provided.innerRef}
              isDragging={snapshot.isDragging}
              onDoubleClick={props.onTaskDoubleClick}
            >
              {props.task.content}
            </TaskContent>
          )}
        </Draggable>
      )}
    </TaskContainer>
  );
}

const Input = styled.textarea`
  font-size: ${(props) => props.fontSize || "inherit"};
  font-family: inherit;
  margin: ${(props) => props.margin || "inherit"};
  padding: ${(props) => props.padding || "inherit"};
  width: 100%;
  color: ${(props) => props.color || "inherit"};
  border: ${(props) => props.border || "inherit"};
  borderRadius: ${(props) => props.borderRadius || "inherit"};
`;
function EditInput(props) {
  const [val, setVal] = useState(props.value);
  return (
    <Input
      type="text"
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyPress={(event) => {
        if (event.key === "Escape") {
          props.onSave(val);
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onBlur={() => props.onSave(val)}
      fontSize={props.fontSize}
      margin={props.margin}
      padding={props.padding}
      color={props.color}
      border={props.border}
      borderRadius={props.borderRadius}
    />
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

function genRandomID() {
  return (Math.random() + 1).toString(36).substring(7);
}

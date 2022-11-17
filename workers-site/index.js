import {
  getAssetFromKV
} from "@cloudflare/kv-asset-handler";

async function getTodos() {
  const data = await todolist.get('todolist')
  console.log(data)
  return new Response(data, {
    headers: { 'Content-Type': 'text/plain' },
  })
}

async function updateTodos(request) {
  const newData = await request.text()
  console.log(newData)

  const currentData = await todolist.get('todolist')
  if (JSON.parse(newData).version <= JSON.parse(currentData).version) {
    return new Response("version is too old", { status: 500 })
  }

  try {
    await todolist.put('todolist', newData)
    return new Response(newData, { status: 200 })
  } catch (err) {
    return new Response(err, { status: 500 })
  }
}

async function handleRequest(event) {
  if (event.request.url.toString().endsWith("data")) {
    if (event.request.method === 'PUT') {
      return updateTodos(event.request)
    } else {
      return getTodos()
    }
  } else {
    try {
      return await getAssetFromKV(event);
    } catch (e) {
      let pathname = new URL(event.request.url).pathname;
      return new Response(`"${pathname}" not found`, {
        status: 404,
        statusText: "not found"
      });
    }
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

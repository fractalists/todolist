import {
  getAssetFromKV
} from "@cloudflare/kv-asset-handler";

async function getTodos() {
  try {
    const data = await todolist.get('todolist')
    console.log(data)
    return new Response(data, {
      headers: { 'Content-Type': 'text/plain' },
    })

  } catch (err) {
    return new Response(err, { status: 500 })
  }
}

async function updateTodos(request) {
  try {
    const newData = await request.text()
    console.log(newData)
    const currentData = await todolist.get('todolist')

    console.log("new data version: " + JSON.parse(newData).version)
    console.log("current data version: " + JSON.parse(currentData).version)

    if (JSON.parse(newData).version <= JSON.parse(currentData).version) {
      return new Response(`version is too old`, { status: 500, statusText: "version is too old" })
    }

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

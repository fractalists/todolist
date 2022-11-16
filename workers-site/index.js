import {
  getAssetFromKV
} from "@cloudflare/kv-asset-handler";

addEventListener("fetch", event => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
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

// addEventListener('fetch', event => {
//   event.respondWith(handle(event)
//     // For ease of debugging, we return exception stack
//     // traces in response bodies. You are advised to
//     // remove this .catch() in production.
//     .catch(e => new Response(e.stack, {
//       status: 500,
//       statusText: "Internal Server Error"
//     }))
//   )
// })

// async function handle(event) {
//   if (event.request.method === "OPTIONS") {
//     return handleOptions(event.request)
//   } else if (event.request.method === "POST") {
//     return handlePost(event.request)
//   } else if (event.request.method === "GET" || event.request.method == "HEAD") {
//     try {
//       return await getAssetFromKV(event);
//     } catch (e) {
//       let pathname = new URL(event.request.url).pathname;
//       return new Response(`"${pathname}" not found`, {
//         status: 404,
//         statusText: "not found"
//       });
//     }
//   } else {
//     return new Response(null, {
//       status: 405,
//       statusText: "Method Not Allowed",
//     })
//   }
// }

// // We support the GET, POST, HEAD, and OPTIONS methods from any origin,
// // and accept the Content-Type header on requests. These headers must be
// // present on all responses to all CORS requests. In practice, this means
// // all responses to OPTIONS or POST requests.
// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type",
// }

// function handleOptions(request) {
//   if (request.headers.get("Origin") !== null &&
//     request.headers.get("Access-Control-Request-Method") !== null &&
//     request.headers.get("Access-Control-Request-Headers") !== null) {
//     // Handle CORS pre-flight request.
//     return new Response(null, {
//       headers: corsHeaders
//     })
//   } else {
//     // Handle standard OPTIONS request.
//     return new Response(null, {
//       headers: {
//         "Allow": "GET, HEAD, POST, OPTIONS",
//       }
//     })
//   }
// }

// async function handlePost(request) {
//   if (request.headers.get("Content-Type") !== "application/json") {
//     return new Response(null, {
//       status: 415,
//       statusText: "Unsupported Media Type",
//       headers: corsHeaders,
//     })
//   }

//   // Detect parse failures by setting `json` to null.
//   let json = await request.json().catch(e => null)
//   if (json === null) {
//     return new Response("JSON parse failure", {
//       status: 400,
//       statusText: "Bad Request",
//       headers: corsHeaders,
//     })
//   }

//   return new Response(JSON.stringify(json), {
//     headers: {
//       "Content-Type": "application/json",
//       ...corsHeaders,
//     }
//   })
// }
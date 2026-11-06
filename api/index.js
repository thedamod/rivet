import server from "../server/http.cjs";

const handler = server.createHandler();

export default function route(req, res) {
  const url = new URL(req.url, "https://rivet.invalid");
  const path = url.searchParams.get("__rivet_path");
  if (path !== null) {
    url.searchParams.delete("__rivet_path");
    req.url = `/api/${path}${url.search}`;
  }
  return handler(req, res);
}

import { headers } from "next/headers";

let BACKEND_BASE = "http://localhost:8080";

const host = headers().get("host"); // 예: aivle-test.duckdns.org

if (host && host !== "localhost" && !host.startsWith("127.0.0.1")) {
  BACKEND_BASE = "http://aivle-test.duckdns.org/spring-api";
}

export { BACKEND_BASE };
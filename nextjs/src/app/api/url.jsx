let BACKEND_BASE = "http://localhost:8080";

// 브라우저 환경에서만 체크
if (typeof window !== "undefined") {
  const host = window.location.hostname;

  if (host !== "localhost" || host !== "127.0.0.1") {
    BACKEND_BASE = "http://aivle-test.duckdns.org/spring-api";
  }
}

export { BACKEND_BASE };
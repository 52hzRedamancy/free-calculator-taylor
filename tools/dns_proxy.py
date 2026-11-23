# -*- coding: utf-8 -*-
"""本地 CONNECT 代理：绕过被污染的 DNS，将 github.com / api.github.com
按候选 IP 列表逐个尝试转发（国内边缘节点优先，失败自动换下一个）。"""
import select
import socket
import threading

UPSTREAM = {
    "github.com": [
        "20.205.243.166",
        "140.82.112.3",
        "140.82.113.3",
        "140.82.114.3",
        "140.82.121.3",
    ],
    "api.github.com": [
        "20.205.243.168",
        "140.82.112.6",
        "140.82.114.6",
        "140.82.113.6",
    ],
}
PORT = 7899


def connect_any(host: str, port: int) -> socket.socket:
    candidates = UPSTREAM.get(host) or [host]
    last_error: Exception | None = None
    for ip in candidates:
        try:
            return socket.create_connection((ip, port), timeout=8)
        except Exception as exc:  # noqa: BLE001 - 换下一个候选 IP
            last_error = exc
    raise last_error or OSError("no upstream")


def pipe(a: socket.socket, b: socket.socket) -> None:
    try:
        while True:
            ready, _, _ = select.select([a, b], [], [], 120)
            if not ready:
                break
            for sock in ready:
                data = sock.recv(65536)
                if not data:
                    return
                (b if sock is a else a).sendall(data)
    except Exception:  # noqa: BLE001
        pass
    finally:
        for sock in (a, b):
            try:
                sock.close()
            except Exception:  # noqa: BLE001
                pass


def handle(conn: socket.socket) -> None:
    try:
        request = b""
        while b"\r\n\r\n" not in request:
            chunk = conn.recv(4096)
            if not chunk:
                return
            request += chunk
        line = request.split(b"\r\n")[0].decode("latin1", "replace")
        method, target, _ = line.split(" ")
        if method != "CONNECT":
            conn.sendall(b"HTTP/1.1 405 Method Not Allowed\r\n\r\n")
            return
        host, port = target.split(":")
        upstream = connect_any(host, int(port))
        conn.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        threading.Thread(target=pipe, args=(conn, upstream), daemon=True).start()
    except Exception:  # noqa: BLE001
        try:
            conn.sendall(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
            conn.close()
        except Exception:  # noqa: BLE001
            pass


def main() -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", PORT))
    server.listen(50)
    print(f"dns-bypass proxy on 127.0.0.1:{PORT}", flush=True)
    while True:
        conn, _ = server.accept()
        threading.Thread(target=handle, args=(conn,), daemon=True).start()


if __name__ == "__main__":
    main()

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [erro, setErro] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem("nfe_user");
    if (!raw) { router.replace("/login"); return; }
    setUser(JSON.parse(raw));
    loadMessages();
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const res = await fetch("/api/chat/messages");
      if (res.ok) setMessages(await res.json());
    } catch {}
  }

  async function sendText() {
    const t = text.trim();
    if (!t || !user || sending) return;
    setText("");
    setSending(true);
    setErro("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remetente: user.usuario, mensagem: t })
      });
      if (!res.ok) setErro("Falha ao enviar mensagem");
    } catch { setErro("Erro de conexão"); }
    setSending(false);
  }

  async function sendAudio(dataUrl) {
    if (!user || sending) return;
    setSending(true);
    setErro("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remetente: user.usuario, mensagem: "", audioDataUrl: dataUrl })
      });
      if (!res.ok) setErro("Falha ao enviar áudio");
    } catch { setErro("Erro de conexão"); }
    setSending(false);
  }

  function startRecording() {
    chunksRef.current = [];
    setRecording(true);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => sendAudio(reader.result);
        reader.readAsDataURL(blob);
      };
      recorder.start();
    }).catch(() => setRecording(false));
  }

  function stopRecording() {
    setRecording(false);
    mediaRecorderRef.current?.stop();
  }

  const nome = user?.usuario || "";

  return (
    <div className="page">
      <div className="chat-wrap">
        <div className="chat-header">
          <span>💬 Chat do Grupo</span>
          <Link href="/app" style={{ color: "#fff", textDecoration: "none", fontSize: 20 }}>✕</Link>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.chat_id} className={`msg-row ${msg.remetente === nome ? "mine" : ""}`}>
              <div className="msg-bubble">
                <div className="msg-sender">{msg.remetente}</div>
                {msg.eh_audio ? (
                  <audio controls src={msg.mensagem} style={{ width: "100%" }} />
                ) : (
                  <div>{msg.mensagem}</div>
                )}
                <div className="msg-time">{msg.data_hora}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {erro && <div className="error-msg" style={{ margin: "8px 12px 0" }}>{erro}</div>}
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
          />
          <button
            className="round-btn"
            onClick={sendText}
            disabled={sending}
            title="Enviar"
            style={{ background: sending ? "#999" : "#1e8e5a" }}
          >
            ➤
          </button>
          <button
            className={`round-btn ${recording ? "recording" : ""}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={sending}
            title={recording ? "Solte para enviar" : "Segure para gravar áudio"}
          >
            {recording ? "🔴" : "🎤"}
          </button>
        </div>
      </div>
    </div>
  );
}
